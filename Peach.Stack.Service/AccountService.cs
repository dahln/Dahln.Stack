using Peach.Stack.Database;
using Peach.Stack.Dto;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Peach.Stack.Services;

/// <summary>
/// Centralizes account lifecycle, admin workflows, and system-settings coordination.
/// The service sits between controllers and ASP.NET Core Identity so the web layer stays thin
/// while application-specific rules remain in one place.
/// </summary>
public class AccountService
{
    private ApplicationDbContext _db { get; }
    private UserManager<IdentityUser> _userManager;
    private SignInManager<IdentityUser> _signInManager;

    public AccountService(ApplicationDbContext applicationDbContext, UserManager<IdentityUser> userManager, SignInManager<IdentityUser> signInManager)
    {
        _db = applicationDbContext;
        _userManager = userManager;
        _signInManager = signInManager;
    }

    /// <summary>
    /// Returns the total number of registered users.
    /// </summary>
    public async Task<int> UserCount()
    {
        return await _db.Users.CountAsync();
    }

    /// <summary>
    /// Loads the singleton system-settings record, creating a default row on first use.
    /// Sensitive values are masked before they are returned to the caller.
    /// </summary>
    public async Task<Dto.SystemSettings> GetSystemSettings()
    {
        var settings = await _db.SystemSettings.FirstOrDefaultAsync();
        if (settings == null)
        {
            settings = new Database.SystemSetting()
            {
                EmailApiKey = null,
                SystemEmailAddress = null,
                RegistrationEnabled = true,
                EmailDomainRestriction = null,
            };
            _db.SystemSettings.Add(settings);
            await _db.SaveChangesAsync();
        }

        var response = new Dto.SystemSettings()
        {
            EmailApiKey = "--- NOT DISPLAYED FOR SECURITY ---",
            SystemEmailAddress = settings.SystemEmailAddress,
            RegistrationEnabled = settings.RegistrationEnabled,
            EmailDomainRestriction = settings.EmailDomainRestriction
        };

        return response;
    }

    /// <summary>
    /// Persists admin-managed system settings and clears Mongo verification whenever the
    /// connection string changes.
    /// </summary>
    public async Task UpdateSystemSettings(Dto.SystemSettings model)
    {
        var settings = await _db.SystemSettings.FirstOrDefaultAsync();
        if (settings == null)
        {
            settings = new Database.SystemSetting()
            {
                EmailApiKey = model.EmailApiKey,
                SystemEmailAddress = model.SystemEmailAddress,
                RegistrationEnabled = model.RegistrationEnabled,
                EmailDomainRestriction = model.EmailDomainRestriction,
            };
            _db.SystemSettings.Add(settings);
            await _db.SaveChangesAsync();
        }

        if (model.EmailApiKey.Trim() == "--- NOT DISPLAYED FOR SECURITY ---")
        {
            settings.EmailApiKey = settings.EmailApiKey;
        }
        else
        {
            settings.EmailApiKey = model.EmailApiKey;
        }
        settings.SystemEmailAddress = model.SystemEmailAddress;
        settings.RegistrationEnabled = model.RegistrationEnabled;
        settings.EmailDomainRestriction = model.EmailDomainRestriction;

        await _db.SaveChangesAsync();
    }

    /// <summary>
    /// Searches the identity user store for the admin screen and annotates each result with
    /// administrator and self information.
    /// </summary>
    public async Task<Dto.SearchResponse<Dto.User>> UserSearch(Dto.Search model, string userId)
    {
        var query = _db.Users.AsQueryable();

        if (!string.IsNullOrEmpty(model.FilterText))
        {
            query = query.Where(i => i.Email.ToLower().ToLower().Contains(model.FilterText.ToLower()));
        }

        if (model.SortBy == nameof(Dto.User.Email))
        {
            if (model.SortDirection == Dto.SortDirection.Ascending)
            {
                query = query.OrderBy(c => c.Email);
            }
            else
            {
                query = query.OrderByDescending(c => c.Email);
            }
        }
        else
        {
            if (model.SortDirection == Dto.SortDirection.Ascending)
            {
                query = query.OrderBy(c => c.Email);
            }
            else
            {
                query = query.OrderByDescending(c => c.Email);
            }
        }

        Dto.SearchResponse<Dto.User> response = new Dto.SearchResponse<Dto.User>();
        response.Total = await query.CountAsync();

        var dataResponse = await query.Skip(model.Page * model.PageSize)
                                    .Take(model.PageSize)
                                    .ToListAsync();

        response.Results = dataResponse.Select(c => new Dto.User()
        {
            Id = c.Id,
            Email = c.Email,
            IsAdministrator = false //Populate this in the next step.
        }).ToList();


        foreach (var user in response.Results)
        {
            var identityUser = await _userManager.FindByIdAsync(user.Id);
            user.IsAdministrator = await _userManager.IsInRoleAsync(identityUser, "Administrator");
            user.IsSelf = user.Id == userId;
        }

        return response;
    }

    /// <summary>
    /// Returns whether new user registration is currently enabled.
    /// </summary>
    public async Task<bool> AccountAllowRegistrationOperations()
    {
        var settings = await _db.SystemSettings.FirstOrDefaultAsync();
        if (settings == null)
        {
            return false;
        }

        return settings.RegistrationEnabled;
    }

    /// <summary>
    /// Returns whether email-driven account operations can run with the current system settings.
    /// </summary>
    public async Task<bool> AccountAllowAllOperations()
    {
        var settings = await _db.SystemSettings.FirstOrDefaultAsync();
        if (settings == null)
        {
            return false;
        }

        var emailApi = settings.EmailApiKey;
        var systemEmailAddress = settings.SystemEmailAddress;

        var allowAllOperations = false;

        if (!string.IsNullOrEmpty(emailApi) && !string.IsNullOrEmpty(systemEmailAddress))
        {
            allowAllOperations = true;
        }

        return allowAllOperations;
    }

    /// <summary>
    /// Deletes a user account and removes user-owned customer records first to avoid orphaned data.
    /// </summary>
    public async Task DeleteAccount(string userId)
    {
        // Remove dependent relational data before deleting the identity record.
        var customersOwnedByThisUser = _db.Customers.Where(x => x.OwnerId == userId);
        _db.Customers.RemoveRange(customersOwnedByThisUser);
        await _db.SaveChangesAsync();

        var user = await _userManager.FindByIdAsync(userId);
        if (user != null)
        {
            await _userManager.DeleteAsync(user);
        }
    }

    /// <summary>
    /// Returns whether the specified user currently has two-factor authentication enabled.
    /// </summary>
    public async Task<bool> AccountTwoFactorEnabled(string userId)
    {
        var user = await _userManager.FindByIdAsync(userId);
        var isTwoFactorEnabled = await _userManager.GetTwoFactorEnabledAsync(user);

        return isTwoFactorEnabled;
    }

    /// <summary>
    /// Toggles the Administrator role on the specified user account.
    /// </summary>
    public async Task ToggleUserAdministratorRole(string userId)
    {
        var user = await _userManager.FindByIdAsync(userId);
        var isAdministrator = await _userManager.IsInRoleAsync(user, "Administrator");
        if (isAdministrator)
        {
            await _userManager.RemoveFromRoleAsync(user, "Administrator");
        }
        else
        {
            await _userManager.AddToRoleAsync(user, "Administrator");
        }
    }

    /// <summary>
    /// Returns all role names assigned to the specified user.
    /// </summary>
    public async Task<List<string>> GeCurrentUserRoles(string userId)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
        {
            return new List<string>();
        }

        var userRoles = await _userManager.GetRolesAsync(user);

        return userRoles.ToList();
    }

    /// <summary>
    /// Returns whether an account already exists for the provided email address.
    /// </summary>
    public async Task<bool> AccountExistsByEmail(string email)
    {
        var user = await _userManager.FindByEmailAsync(email);
        return user != null;
    }

    /// <summary>
    /// Ends the current sign-in session.
    /// </summary>
    public async Task AccountLogout()
    {
        await _signInManager.SignOutAsync();
    }

    /// <summary>
    /// Creates a new user account after enforcing registration policy, domain restrictions,
    /// first-user administrator bootstrap, and default tag seeding when Mongo is enabled.
    /// </summary>
    public async Task<List<string>> Register(string email, string password)
    {
        List<string> results = new List<string>();

        var settings = await GetSystemSettings();
        // Stop immediately when registration is disabled globally.
        if (settings.RegistrationEnabled == false)
        {
            results.Add("Registration Disabled");
            return results;
        }

        // Optionally restrict sign-up to approved email domains.
        if (string.IsNullOrEmpty(settings.EmailDomainRestriction) == false)
        {
            var validDomains = settings.EmailDomainRestriction.Split(",").ToList();
            for (int a = 0; a < validDomains.Count; a++)
            {
                validDomains[a] = validDomains[a].Replace("@", "").ToLower();
            }
            var registrationDomain = email.ToLower().Split("@").LastOrDefault();
            if (validDomains.Contains(registrationDomain) == false)
            {
                results.Add($"Invalid domain. You must use an email ending in: {settings.EmailDomainRestriction}");
                return results;
            }
        }

        // Create the identity record once all application-level validation has passed.
        var user = new IdentityUser
        {
            UserName = email,
            Email = email,
        };

        var result = await _userManager.CreateAsync(user, password);

        if (result.Succeeded)
        {
            var identity = await _userManager.FindByEmailAsync(email);
            var userCount = await _db.Users.CountAsync();
            if (userCount == 1 && identity != null)
            {
                // Bootstrap the first registered account as the initial administrator.
                await _userManager.AddToRoleAsync(identity, "Administrator");
            }

            return results;
        }

        foreach (var error in result.Errors)
        {
            results.Add(error.Description);
        }

        return results;
    }

}
