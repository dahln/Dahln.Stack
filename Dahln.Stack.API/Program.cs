using System.Security.Claims;
using Dahln.Stack.API.Utility;
using Dahln.Stack.Database;
using Dahln.Stack.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity.UI.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Register framework services and application dependencies.

// Allow services outside the controller layer to inspect the current request/user.
builder.Services.AddHttpContextAccessor();

// Persist identity data and relational settings in SQLite.
builder.Services.AddDbContext<ApplicationDbContext>(
    options => options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

// Identity handles authentication; this adds role-based authorization policies on top.
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("RequireAdministratorRole", policy => policy.RequireRole("Administrator"));
});

// Expose the built-in identity endpoints backed by Entity Framework stores.
builder.Services.AddIdentityApiEndpoints<IdentityUser>()
    .AddRoles<IdentityRole>()
    .AddEntityFrameworkStores<ApplicationDbContext>();

// Password reset and email confirmation tokens stay valid for one day.
builder.Services.Configure<DataProtectionTokenProviderOptions>(options => options.TokenLifespan = TimeSpan.FromDays(1));

// Configure the default account lockout behaviour.
builder.Services.Configure<IdentityOptions>(options =>
{
    options.Lockout.AllowedForNewUsers = true;
    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(5);
    options.Lockout.MaxFailedAccessAttempts = 5;
    //options.SignIn.RequireConfirmedEmail = true;
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Register application services.
builder.Services.AddTransient<UserManager<IdentityUser>>();
builder.Services.AddTransient<RoleManager<IdentityRole>>();
builder.Services.AddTransient<SignInManager<IdentityUser>>();
builder.Services.AddTransient<IEmailSender<IdentityUser>, EmailSender>();

builder.Services.AddScoped<AccountService>();
builder.Services.AddScoped<CustomerService>();

var app = builder.Build();

// Bring the database and role/bootstrap data into a usable state before serving requests.
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;

    var db = services.GetRequiredService<ApplicationDbContext>();
    var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();
    if (db != null)
    {
        // Auto-apply pending EF Core migrations in development-style deployments.
        var migrations = db.Database.GetPendingMigrations();
        if (migrations.Any())
        {
            db.Database.Migrate();
        }
    }

    var roleSystemAdministratorExists = await roleManager.RoleExistsAsync("Administrator");
    if (!roleSystemAdministratorExists)
    {
        // Create the "Administrator" role if it doesn't exist
        await roleManager.CreateAsync(new IdentityRole("Administrator"));
    }

    var systemSettings = db.SystemSettings.Any();
    if (systemSettings == false)
    {
        var newSystemSettings = new SystemSetting();
        db.SystemSettings.Add(newSystemSettings);
        db.SaveChanges();
    }
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseRouting();

// Authorization must be in the middleware pipeline for controller attributes to work.
app.UseAuthorization();

app.MapControllers();

// Keep the built-in identity endpoints available, but redirect the legacy registration path
// to the application-specific account controller that adds extra registration rules.
app.MapGroup("/api").MapIdentityApi<IdentityUser>().WithTags("Identity");
app.MapPost("/api/register", () => "Deprecated. Use /api/v1/account/register.").ExcludeFromDescription();
app.MapPost("/register", () => Results.Redirect("/api/v1/account/register", permanent: true)).ExcludeFromDescription();

app.Run();


