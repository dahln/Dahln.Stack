## Overview
Dahln.Stack is am Opinionated .NET 10 + React starter template using a **decoupled proxy** architecture. The API and frontend run as independent processes during development and are deployed as separate applications behind Nginx in production.

## Solution Layout
- `Dahln.Stack.API`: ASP.NET Core Web API, controllers, and Identity endpoints
- `Dahln.Stack.App`: React + Vite frontend
- `Dahln.Stack.Service`: business logic and database orchestration
- `Dahln.Stack.Database`: EF Core DbContext, entities, and migrations
- `Dahln.Stack.Dto`: shared DTOs and enums
- `Dahln.Stack.Test`: unit tests for service logic

## Technologies
- .NET 10
- ASP.NET Core Web API
- React + Vite
- ASP.NET Core Identity with cookie auth and 2FA support
- Entity Framework Core + SQLite
- Bootstrap + Bootstrap Icons
- Scalar/OpenAPI in development

## Local Development — Quick Start

Two terminals are required.

### Terminal 1 — API

```powershell
dotnet run --project Dahln.Stack.API\Dahln.Stack.API.csproj --launch-profile https
```

API runs at: **https://localhost:7001**  
Scalar API docs (dev only): **https://localhost:7001/scalar**

### Terminal 2 — Frontend

```powershell
cd Dahln.Stack.App
npm install        # first time only
npm run dev
```

Frontend runs at: **https://localhost:5173**

All `/api/*` requests from the frontend are proxied to `https://localhost:7001` by Vite — no CORS configuration needed.

### Trust the dev certificate (first time only)

```powershell
dotnet dev-certs https --trust
```

### Open the app

Navigate to **https://localhost:5173**

The SQLite database is created and migrations are applied automatically on first API startup.

## Getting Started (new project)
1. Clone the repository.
2. Optional: rename the solution with `RenameProject.ps1`.
3. Trust the dev certificate (see above).
4. Run the API and frontend (see above).

## Authentication And Email
Authentication uses ASP.NET Core Identity and stores user data in your database.

SMTP2GO is optional but recommended if you want email-driven flows such as:
- email confirmation
- password recovery
- email/username changes

Without SMTP configuration, the application still runs, but email-dependent account flows are limited.

## Database Commands
Run these from the solution root:

```powershell
dotnet ef migrations add InitialCreate --project Dahln.Stack.Database --startup-project Dahln.Stack.API
```

```powershell
dotnet ef database update --project Dahln.Stack.Database --startup-project Dahln.Stack.API
```

## Ignore Local App Settings Changes
If you want to keep local configuration changes out of git:

```powershell
git update-index --assume-unchanged .\Dahln.Stack.API\appsettings.json
```

To reverse it:

```powershell
git update-index --no-assume-unchanged .\Dahln.Stack.API\appsettings.json
```

## License
This project uses the Unlicense. See `LICENSE` for the full text.

## Resources
- [Identity API with WebAPI](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/identity-api-authorization?view=aspnetcore-8.0)
- [EF Core CLI](https://learn.microsoft.com/en-us/ef/core/cli/dotnet)




