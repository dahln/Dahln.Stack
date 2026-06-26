using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Peach.Stack.API.Utility;
using System.Text;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Identity;
using Peach.Stack.Dto;
using Peach.Stack.Database;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity.Data;
using Peach.Stack.Services;
using System.ComponentModel;

namespace Peach.Stack.API.Controllers;

[ApiController]
/// <summary>
/// Hosts account, administration, and system-settings endpoints that sit beside the built-in
/// ASP.NET Core Identity API. These actions cover the application-specific rules that the
/// generated identity endpoints do not enforce, such as registration gating and admin workflows.
/// </summary>
public class AccountController : Controller
{
    private readonly AccountService _accountService;

    public AccountController(AccountService accountService)
    {
        _accountService = accountService;
    }

    /// <summary>
    /// Registers a new account after the service layer applies registration enablement,
    /// domain restrictions, and first-user administrator bootstrap rules.
    /// </summary>
    [HttpPost]
    [Route("api/v1/account/register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest model)
    {
        // Validate model
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).FirstOrDefault());
        }

        var response = await _accountService.Register(model.Email, model.Password);

        if (response.Count == 0)
        {
            return Ok();
        }
        else
        {
            return BadRequest(response.FirstOrDefault());
        }
    }

    [Authorize]
    [HttpGet]
    [Route("api/v1/account/logout")]
    [Description("Logs out the current user by invalidating their authentication session.")]
    /// <summary>
    /// Logs out the currently authenticated user.
    /// </summary>
    public async Task<IActionResult> AccountLogout()
    {
        await _accountService.AccountLogout();
        return Ok();
    }

    /// <summary>
    /// Call this BEFORE allowing the change of email.
    /// WHY? Because the identity API doesn't check if an email is unique when updating user email with POST:manage/info.
    /// </summary>
    [Authorize]
    [HttpPost]
    [Route("api/v1/account/exists")]
    public async Task<IActionResult> AccountExistsByEmail([FromBody] AccountEmail model)
    {
        var userExists = await _accountService.AccountExistsByEmail(model.Email);
        return Ok(userExists);
    }

    /// <summary>
    /// Deletes the current user account and any user-owned data cascaded by the service layer.
    /// </summary>
    [Authorize]
    [HttpDelete]
    [Route("api/v1/account")]
    public async Task<IActionResult> DeleteAccount()
    {
        string userId = User.GetUserId();

        await _accountService.DeleteAccount(userId);

        return Ok();
    }

    /// <summary>
    /// Return True or False to let the App know if the API/Server will allow all operations. 
    /// For example, if the Server does not have a SendGrid API key then Password Recovery and Changing Email is 
    /// not allowed because the recovery and confirmation emails will never be sent.
    /// </summary>
    [HttpGet]
    [Route("api/v1/account/operations")]
    public async Task<IActionResult> AccountAllowAllOperations()
    {
        var allowAllOperations = await _accountService.AccountAllowAllOperations();

        return Ok(allowAllOperations);
    }

    [HttpGet]
    [Route("api/v1/account/operations/registration")]
    public async Task<IActionResult> AccountAllowRegistrationOperations()
    {
        var allow = await _accountService.AccountAllowRegistrationOperations();
        return Ok(allow);
    }

    /// <summary>
    /// Returns the current user's role names so the frontend can tailor navigation and features.
    /// </summary>
    [Authorize]
    [HttpGet]
    [Route("api/v1/account/roles")]
    public async Task<IActionResult> GeCurrentUserRoles()
    {
        string userId = User.GetUserId();

        var userRoles = await _accountService.GeCurrentUserRoles(userId);

        return Ok(userRoles);
    }

    /// <summary>
    /// Returns whether two-factor authentication is enabled for the current user.
    /// </summary>
    [HttpGet]
    [Route("api/v1/account/2fa")]
    public async Task<IActionResult> AccountTwoFactorEnabled()
    {
        string userId = User.GetUserId();

        var isTwoFactorEnabled = await _accountService.AccountTwoFactorEnabled(userId);

        return Ok(isTwoFactorEnabled);
    }

    /// <summary>
    /// Grants or removes the Administrator role for another user account.
    /// </summary>
    [Authorize(Roles = "Administrator")]
    [HttpGet]
    [Route("api/v1/user/{userId}/role/administrator")]
    public async Task<IActionResult> ToggleUserAdministratorRole(string userId)
    {
        string currentUserId = User.GetUserId();

        if (currentUserId == userId)
        {
            return BadRequest("You cannot toggle your own administrative role");
        }

        await _accountService.ToggleUserAdministratorRole(userId);

        return Ok();
    }

    /// <summary>
    /// Allows an administrator to delete another user account while preventing self-deletion.
    /// </summary>
    [Authorize(Roles = "Administrator")]
    [HttpDelete]
    [Route("api/v1/user/{userId}")]
    public async Task<IActionResult> DeleteUserAsAdministrator(string userId)
    {
        string currentUserId = User.GetUserId();
        if (currentUserId == userId)
        {
            return BadRequest("Cannot delete this account.");
        }

        await _accountService.DeleteAccount(userId);

        return Ok();
    }

    /// <summary>
    /// Searches users for the admin screen and annotates each result with role and self metadata.
    /// </summary>
    [Authorize(Roles = "Administrator")]
    [HttpPost]
    [Route("api/v1/users")]
    public async Task<IActionResult> UserSearch([FromBody] Dto.Search model)
    {
        string userId = User.GetUserId();

        var response = await _accountService.UserSearch(model, userId);

        return Ok(response);
    }

    /// <summary>
    /// Updates the singleton system-settings record used by the admin experience.
    /// </summary>
    [Authorize(Roles = "Administrator")]
    [HttpPut]
    [Route("api/v1/settings")]
    public async Task<IActionResult> UpdateSystemSettings([FromBody] Dto.SystemSettings model)
    {
        await _accountService.UpdateSystemSettings(model);

        return Ok();
    }

    /// <summary>
    /// Returns the current system-settings snapshot for the admin screen.
    /// </summary>
    [Authorize(Roles = "Administrator")]
    [HttpGet]
    [Route("api/v1/settings")]
    public async Task<IActionResult> GetSystemSettings()
    {
        var response = await _accountService.GetSystemSettings();

        return Ok(response);
    }

}




