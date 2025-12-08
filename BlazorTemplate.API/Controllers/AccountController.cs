using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using BlazorTemplate.API.Utility;
using System.Text;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Identity;
using BlazorTemplate.Dto;
using BlazorTemplate.Database;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity.Data;
using System.Drawing;
using BlazorTemplate.Service;
using System.ComponentModel;

namespace BlazorTemplate.API.Controllers;

[ApiController]
public class AccountController : Controller
{
    private AccountService _accountService;
    public AccountController(AccountService accountService)
    {
        _accountService = accountService;
    }

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

        if(response.Count == 0)
            return Ok();
        else
            return BadRequest(response.FirstOrDefault());
    }

    [Authorize]
    [HttpGet]
    [Route("api/v1/account/logout")]
    [Description("Logs out the current user by invalidating their authentication session.")]
    async public Task<IActionResult> AccountLogout()
    {
        await _accountService.AccountLogout();
        return Ok();
    }

    /// <summary>
    /// Call this BEFORE allowing the change of email.
    /// WHY? Because the identity API doesn't check if an email is unique when updating user email with POST:manage/info.
    /// </summary>
    /// <param name="model"></param>
    /// <returns></returns>
    [Authorize]
    [HttpPost]
    [Route("api/v1/account/exists")]
    async public Task<IActionResult> AccountExistsByEmail([FromBody]AccountEmail model)
    {
        var userExists = await _accountService.AccountExistsByEmail(model.Email);
        return Ok(userExists);
    }

    [Authorize]
    [HttpDelete]
    [Route("api/v1/account")]
    async public Task<IActionResult> DeleteAccount()
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
    /// <param name="model"></param>
    /// <returns></returns>
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

    [Authorize]
    [HttpGet]
    [Route("api/v1/account/roles")]
    async public Task<IActionResult> GeCurrentUserRoles()
    {
        string userId = User.GetUserId();
        
        var userRoles = await _accountService.GeCurrentUserRoles(userId);

        return Ok(userRoles);
    }


    [HttpGet]
    [Route("api/v1/account/2fa")]
    public async Task<IActionResult> AccountTwoFactorEnabled()
    {
        string userId = User.GetUserId();

        var isTwoFactorEnabled = await _accountService.AccountTwoFactorEnabled(userId);
        
        return Ok(isTwoFactorEnabled);
    }

    [Authorize(Roles = "Administrator")]
    [HttpGet]
    [Route("api/v1/user/{userId}/role/administrator")]
    async public Task<IActionResult> ToggleUserAdministratorRole(string userId)
    {
        string currentUserId = User.GetUserId();

        if(currentUserId == userId)
            return BadRequest("You cannot toggle your own administrative role");

        await _accountService.ToggleUserAdministratorRole(userId);

        return Ok();
    }

    [Authorize(Roles = "Administrator")]
    [HttpDelete]
    [Route("api/v1/user/{userId}")]
    async public Task<IActionResult> DeleteUserAsAdministrator(string userId)
    {
        string currentUserId = User.GetUserId();
        if(currentUserId == userId)
            return BadRequest("Cannot delete this account.");

        await _accountService.DeleteAccount(userId);

        return Ok();
    }

    [Authorize(Roles = "Administrator")]
    [HttpPost]
    [Route("api/v1/users")]
    async public Task<IActionResult> UserSearch([FromBody] Dto.Search model)
    {
        string userId = User.GetUserId();

        var response = await _accountService.UserSearch(model, userId);

        return Ok(response);
    }

    [Authorize(Roles = "Administrator")]
    [HttpPut]
    [Route("api/v1/settings")]
    async public Task<IActionResult> UpdateSystemSettings([FromBody] Dto.SystemSettings model)
    {
        await _accountService.UpdateSystemSettings(model);

        return Ok();
    }

    [Authorize(Roles = "Administrator")]
    [HttpGet]
    [Route("api/v1/settings")]
    async public Task<IActionResult> GetSystemSettings()
    {
        var response = await _accountService.GetSystemSettings();

        return Ok(response);
    }
    
}



