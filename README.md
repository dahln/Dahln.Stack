- [ ] DEMO: Coming soon
- [ ] Testing new install.sh script - used for either manual or automatted deployments
- [ ] Add badges

## Overview
Dahln.Stack is am Opinionated .NET 10 + React starter template using a **decoupled proxy** architecture. The API and frontend run as independent processes during development and are deployed as separate applications behind Nginx in production.

## 2026 Announcement & Update
With the latest updates, I have decided to refocus this template project on React. Working with Blazor WASM is fun, and I'm passionate about Blazor. However, over the past 2 years the only Blazor work I have done has been my own 'passion projects', and even some of those projects are now in React. I'm rebranding the project to 'Dahln.Stack', emphasizing that this is my preferred stack choice, at the moment. This rename will make future technology pivots more fluid. I have branched the current Blazor version and will keep that, and other archived branches, as a reference. Until recently my changes have been in another branch, and in order to finish the template restructuring I must now bring them into the master branch - your patience is appreciated while I finalize my current changes.

## Solution Layout
- `Dahln.Stack.API`: ASP.NET Core Web API, controllers, and Identity endpoints
- `Dahln.Stack.App`: React + Vite frontend
- `Dahln.Stack.Service`: business logic and database orchestration
- `Dahln.Stack.Database`: EF Core DbContext, entities, and migrations
- `Dahln.Stack.Dto`: shared DTOs and enums
- `Dahln.Stack.Test`: unit tests for service logic

![Architecture-Image](https://github.com/dahln/BlazorWasmAndApiTemplate/blob/bc91551394dd92649c239290dc8d05b8810f5d00/ArchitectureDiagram.png)

## Technologies
- .NET 10
- ASP.NET Core Web API
- React + Vite
- ASP.NET Core Identity with cookie auth and 2FA support
- Entity Framework Core + SQLite
- Bootstrap + Bootstrap Icons
- Scalar/OpenAPI in development

## Local Development - Quick Start

Two terminals are required.

### Terminal 1 - API

```
dotnet run --project Dahln.Stack.API\Dahln.Stack.API.csproj --launch-profile https
```

API runs at: **https://localhost:7001**  
Scalar API docs (dev only): **https://localhost:7001/scalar**

### Terminal 2 - Frontend

```
cd Dahln.Stack.App
npm install        # first time only
npm run dev
```

Frontend runs at: **https://localhost:5173**

All `/api/*` requests from the frontend are proxied to `https://localhost:7001` by Vite - no CORS configuration needed.

### Trust the dev certificate (first time only)

```
dotnet dev-certs https --trust
```

### Open the app

Navigate to **https://localhost:5173**

The SQLite database is created and migrations are applied automatically on first API startup.


## Authentication And Email
Authentication uses ASP.NET Core Identity and stores user data in your database.

SMTP2GO is optional but recommended if you want email-driven flows such as:
- email confirmation
- password recovery
- email/username changes

Without SMTP configuration, the application still runs, but email-dependent account flows are limited.

## Database Commands
Run these from the solution root:

```
dotnet ef migrations add InitialCreate --project Dahln.Stack.Database --startup-project Dahln.Stack.API
```

```
dotnet ef database update --project Dahln.Stack.Database --startup-project Dahln.Stack.API
```

## Ignore Local App Settings Changes
If you want to keep local configuration changes out of git:

```
git update-index --assume-unchanged .\Dahln.Stack.API\appsettings.json
```

To reverse it:

```
git update-index --no-assume-unchanged .\Dahln.Stack.API\appsettings.json
```

## Deployment

Review DEPLOYMENT.md for instructions on how to deploy the application

## License
This project uses the Unlicense. See `LICENSE` for the full text.

## Resources
- [Identity API with WebAPI](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/identity-api-authorization?view=aspnetcore-8.0)
- [EF Core CLI](https://learn.microsoft.com/en-us/ef/core/cli/dotnet)




