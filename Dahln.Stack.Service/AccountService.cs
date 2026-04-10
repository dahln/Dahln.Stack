using Dahln.Stack.Database;
using Dahln.Stack.Dto;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Dahln.Stack.Service;

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

    public async Task<int> UserCount()
    {
        var users = await _db.Users.ToListAsync();

        return await _db.Users.CountAsync();
    }

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
                EmailDomainRestriction = null
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
                EmailDomainRestriction = model.EmailDomainRestriction
            };
            _db.SystemSettings.Add(settings);
            await _db.SaveChangesAsync();
        }
        
        settings.EmailApiKey = model.EmailApiKey.Trim() == "--- NOT DISPLAYED FOR SECURITY ---" ? settings.EmailApiKey : model.EmailApiKey;
        settings.SystemEmailAddress = model.SystemEmailAddress;
        settings.RegistrationEnabled = model.RegistrationEnabled;
        settings.EmailDomainRestriction = model.EmailDomainRestriction;
        
        await _db.SaveChangesAsync();
    }

    public async Task<Dto.SearchResponse<Dto.User>> UserSearch(Dto.Search model, string userId)
    {
        var query = _db.Users.AsQueryable();

        if (!string.IsNullOrEmpty(model.FilterText))
        {
            query = query.Where(i => i.Email.ToLower().ToLower().Contains(model.FilterText.ToLower()));
        }

        if (model.SortBy == nameof(Dto.User.Email))
        {
            query = model.SortDirection == Dto.SortDirection.Ascending
                        ? query.OrderBy(c => c.Email)
                        : query.OrderByDescending(c => c.Email);
        }
        else
        {
            query = model.SortDirection == Dto.SortDirection.Ascending
                        ? query.OrderBy(c => c.Email)
                        : query.OrderByDescending(c => c.Email);
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

    public async Task<bool> AccountAllowRegistrationOperations()
    {
        var settings = await _db.SystemSettings.FirstOrDefaultAsync();
        if (settings == null)
            return false;

        return settings.RegistrationEnabled;
    }

    public async Task<bool> AccountAllowAllOperations()
    {
        var settings = await _db.SystemSettings.FirstOrDefaultAsync();
        if (settings == null)
            return false;

        var emailApi = settings.EmailApiKey;
        var systemEmailAddress = settings.SystemEmailAddress;

        var allowAllOperations = false;

        if (!string.IsNullOrEmpty(emailApi) && !string.IsNullOrEmpty(systemEmailAddress))
            allowAllOperations = true;

        return allowAllOperations;
    }

    async public Task DeleteAccount(string userId)
    {
        //Delete user and all their customers.
        var customersOwnedByThisUser = _db.Customers.Where(x => x.OwnerId == userId);
        _db.Customers.RemoveRange(customersOwnedByThisUser);
        await _db.SaveChangesAsync();

        var user = await _userManager.FindByIdAsync(userId);
        if (user != null)
            await _userManager.DeleteAsync(user);
    }

    public async Task<bool> AccountTwoFactorEnabled(string userId)
    {
        var user = await _userManager.FindByIdAsync(userId);
        var isTwoFactorEnabled = await _userManager.GetTwoFactorEnabledAsync(user);

        return isTwoFactorEnabled;
    }

    async public Task ToggleUserAdministratorRole(string userId)
    {
        var user = await _userManager.FindByIdAsync(userId);
        var IsAdministrator = await _userManager.IsInRoleAsync(user, "Administrator");
        if (IsAdministrator)
            await _userManager.RemoveFromRoleAsync(user, "Administrator");
        else
            await _userManager.AddToRoleAsync(user, "Administrator");
    }

    async public Task<List<string>> GeCurrentUserRoles(string userId)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
            return new List<string>();

        var userRoles = await _userManager.GetRolesAsync(user);

        return userRoles.ToList();
    }

    async public Task<bool> AccountExistsByEmail(string email)
    {
        var user = await _userManager.FindByEmailAsync(email);
        return user != null;
    }

    async public Task AccountLogout()
    {
        await _signInManager.SignOutAsync();
    }

    public async Task<List<string>> Register(string email, string password)
    {
        List<string> results = new List<string>();


        var settings = await GetSystemSettings();
        //If setting is DISABLED, do not allow registration
        if (settings.RegistrationEnabled == false)
        {
            results.Add("Registration Disabled");
            return results;
        }

        //If setting is enabled, limit registration by email "Domain".
        //Example: Only allow users who's email address ends with a '@dahlnstack.com'
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

        // Create a new ApplicationUser with the provided details
        var user = new IdentityUser
        {
            UserName = email,
            Email = email,
        };

        // Attempt to create the user
        var result = await _userManager.CreateAsync(user, password);

        // Check if user creation was successful
        if (result.Succeeded)
        {
            var usersCount = await UserCount();
            if (usersCount == 1)
            {
                var identity = await _userManager.FindByEmailAsync(email);
                await _userManager.AddToRoleAsync(identity, "Administrator");
            }

            return results; // Success
        }


        // If there were errors, add them to the ModelState
        foreach (var error in result.Errors)
        {
            results.Add(error.Description);
        }

        return results; // Return errors
    }
}
