using Dahln.Stack.Database;
using Dahln.Stack.Service;
using Dahln.Stack.Dto;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.InMemory;
using System.Threading.Tasks;
using System;
using System.Linq;
using Microsoft.AspNetCore.Identity;
using Moq;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Http;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Dahln.Stack.Test;


[TestClass]
public class AccountServiceTests
{
    private ApplicationDbContext GetInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new ApplicationDbContext(options);
    }

    private async Task<AccountService> GetAccountService(ApplicationDbContext db)
    {
        // Setup DI using the provided db context
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddSingleton<IHttpContextAccessor, HttpContextAccessor>();
        services.AddSingleton(db); // Use the passed-in db context
        services.AddIdentity<IdentityUser, IdentityRole>()
            .AddEntityFrameworkStores<ApplicationDbContext>()
            .AddDefaultTokenProviders();

        var provider = services.BuildServiceProvider();
        var userManager = provider.GetRequiredService<UserManager<IdentityUser>>();
        var signInManager = provider.GetRequiredService<SignInManager<IdentityUser>>();
        var roleManager = provider.GetRequiredService<RoleManager<IdentityRole>>();

        var roleSystemAdministratorExists = await roleManager.RoleExistsAsync("Administrator");
        if (!roleSystemAdministratorExists)
        {
            // Create the "Administrator" role if it doesn't exist
            await roleManager.CreateAsync(new IdentityRole("Administrator"));
        }

        return new AccountService(db, userManager, signInManager);
    }

    [TestMethod]
    public async Task UserRegistration()
    {
        var db = GetInMemoryDbContext();
        var service = await GetAccountService(db);

        //Register a user
        var result = await service.Register("test@example.com", "Password123!");

        var count = await service.UserCount();
        Assert.AreEqual(1, count);
    }

    [TestMethod]
    public async Task GetSystemSettings()
    {
        var db = GetInMemoryDbContext();
        var service = await GetAccountService(db);
        
        var settings = await service.GetSystemSettings();
        Assert.IsNotNull(settings);
        Assert.IsNull(settings.SystemEmailAddress);
        Assert.AreEqual("--- NOT DISPLAYED FOR SECURITY ---", settings.EmailApiKey);
    }

    [TestMethod]
    public async Task UpdateSystemSettings()
    {
        var db = GetInMemoryDbContext();
        var service = await GetAccountService(db);


        var settings = await service.GetSystemSettings();
        settings.RegistrationEnabled = false;
        await service.UpdateSystemSettings(settings);

        settings = await service.GetSystemSettings();
        Assert.IsNotNull(settings);
        Assert.IsFalse(settings.RegistrationEnabled);
    }

    [TestMethod]
    public async Task AccountAllowRegistrationOperations()
    {
        var db = GetInMemoryDbContext();
        db.SystemSettings.Add(new SystemSetting {
            RegistrationEnabled = true
        });
        db.SaveChanges();
        var service = await GetAccountService(db);
        
        var result = await service.AccountAllowRegistrationOperations();
        Assert.IsTrue(result);
    }

    [TestMethod]
    public async Task AccountAllowAllOperationsIfSettingsExist()
    {
        var db = GetInMemoryDbContext();
        var service = await GetAccountService(db);

        //Settings will be created on application startup, but if missing, this should return false 
        var result = await service.AccountAllowAllOperations();
        Assert.IsFalse(result);
    }

    [TestMethod]
    public async Task FirstRegisteredUserShouldBeAdmin()
    {
        var db = GetInMemoryDbContext();
        var service = await GetAccountService(db);
        
        var result = await service.Register("admin@example.com", "Password123!");
        Assert.AreEqual(0, result.Count); // No errors
        
        var user = db.Users.FirstOrDefault(u => u.Email == "admin@example.com");
        Assert.IsNotNull(user);
        
        // Check admin role
        var roles = await service.GeCurrentUserRoles(user.Id);
        Assert.IsTrue(roles.Contains("Administrator"));
    }

    [TestMethod]
    public async Task DeleteAccountAndAssociatedCustomersTest()
    {
        var db = GetInMemoryDbContext();
        var service = await GetAccountService(db);
        
        await service.Register("deleteuser@example.com", "Password123!");
        var user = db.Users.First(u => u.Email == "deleteuser@example.com");
        db.Customers.Add(new Dahln.Stack.Database.Customer { OwnerId = user.Id, Name = "TestCustomer" });
        db.SaveChanges();
        await service.DeleteAccount(user.Id);
        Assert.IsNull(db.Users.FirstOrDefault(u => u.Id == user.Id));
        Assert.AreEqual(0, db.Customers.Where(c => c.OwnerId == user.Id).Count());
    }

    [TestMethod]
    public async Task AccountExistsByEmailTest()
    {
        var db = GetInMemoryDbContext();
        var service = await GetAccountService(db);
        
        await service.Register("exists@example.com", "Password123!");
        var exists = await service.AccountExistsByEmail("exists@example.com");
        Assert.IsTrue(exists);
        
        var notExists = await service.AccountExistsByEmail("notfound@example.com");
        Assert.IsFalse(notExists);
    }

    [TestMethod]
    public async Task GetCurrentUserRolesTest()
    {
        var db = GetInMemoryDbContext();
        var service = await GetAccountService(db);
       
        await service.Register("roleuser@example.com", "Password123!");
        var user = db.Users.First(u => u.Email == "roleuser@example.com");
        var roles = await service.GeCurrentUserRoles(user.Id);
        Assert.IsNotNull(roles);
        Assert.IsTrue(roles.Count >= 0);
    }

    [TestMethod]
    public async Task ToggleUserAdministratorRoleToNonAdminTest()
    {
        var db = GetInMemoryDbContext();
        var service = await GetAccountService(db);
        
        await service.Register("firstUserAdminByDefault@example.com", "Password123!");
        await service.Register("toggleadmin@example.com", "Password123!");
        var user = db.Users.First(u => u.Email == "toggleadmin@example.com");
        await service.ToggleUserAdministratorRole(user.Id); // Should add admin
        var roles = await service.GeCurrentUserRoles(user.Id);
        Assert.IsTrue(roles.Contains("Administrator"));
        
        await service.ToggleUserAdministratorRole(user.Id); // Should remove admin
        roles = await service.GeCurrentUserRoles(user.Id);
        Assert.IsFalse(roles.Contains("Administrator"));
    }

    [TestMethod]
    public async Task AccountTwoFactorEnabledTest()
    {
        var db = GetInMemoryDbContext();
        var service = await GetAccountService(db);
        
        await service.Register("2fauser@example.com", "Password123!");
        var user = db.Users.First(u => u.Email == "2fauser@example.com");
        var enabled = await service.AccountTwoFactorEnabled(user.Id);
        Assert.IsFalse(enabled); // By default, 2FA is not enabled
    }

    [TestMethod]
    public async Task UserSearchTest()
    {
        var db = GetInMemoryDbContext();
        var service = await GetAccountService(db);
        
        await service.Register("firstUserAdminByDefault@example.com", "Password123!");
        var administratorUser = db.Users.First(u => u.Email == "firstUserAdminByDefault@example.com");

        //Create 25 users and search for them
        for (int a = 0; a < 25; a++)
        {
            await service.Register($"user{a}@example.com", "Password123!");
        }

        Search search = new Search()
        {
            Page = 0,
            PageSize = 10,
            SortBy = "Email",
            SortDirection = SortDirection.Ascending,
            FilterText = "user"
        };

        var result = await service.UserSearch(search, administratorUser.Id);
        Assert.AreEqual(10, result.Results.Count);

        search.FilterText = "user24";
        var singleResult = await service.UserSearch(search, administratorUser.Id);
        Assert.AreEqual(1, singleResult.Results.Count);
    }
}

