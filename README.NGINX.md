# Nginx Reverse Proxy Setup for Dahln.Stack

This guide describes a production deployment where:
- `Dahln.Stack.API` runs independently on Kestrel.
- `Dahln.Stack.App` is built with Vite and served by Nginx as static files.
- `/api/*` is proxied to Kestrel.
- All other routes are served from the frontend build output with SPA fallback to `index.html`.

## 1. Build and publish artifacts

### API
Publish the API to a folder used by your process manager (systemd, Windows Service, container, etc.).

```bash
dotnet publish Dahln.Stack.API/Dahln.Stack.API.csproj -c Release -o /opt/dahln/api
```

Run it so Kestrel listens on an internal port (example: `7001`).

### Frontend
Build the React app with Vite. Output is generated in `dist` (Vite default).

```bash
cd Dahln.Stack.App
npm ci
npm run build
```

Copy `Dahln.Stack.App/dist` to your web root (example: `/var/www/dahln-stack/dist`).

## 2. Nginx server block

Replace `example.com` and paths with your real values.

```nginx
server {
    listen 80;
    server_name example.com;

    # Vite production build output
    root /var/www/dahln-stack/dist;
    index index.html;

    # Proxy API requests to .NET Kestrel
    location /api/ {
        proxy_pass https://127.0.0.1:7001/;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Optional for self-signed internal certs. Prefer trusted certs internally.
        proxy_ssl_verify off;
    }

    # Serve static files when present, otherwise hand off to React Router
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## 3. SSL (Let's Encrypt placeholder)

Add certbot-managed TLS config after domain DNS is ready.

```nginx
# Placeholder example
server {
    listen 443 ssl http2;
    server_name example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    root /var/www/dahln-stack/dist;
    index index.html;

    location /api/ {
        proxy_pass https://127.0.0.1:7001/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## 4. Development model alignment

In development:
- API runs on `https://localhost:7001`.
- Vite runs on `https://localhost:5173`.
- Vite proxies `/api/*` to the API.
- Frontend code should call relative API paths (via `/api`) instead of hardcoded backend origins.

This preserves a unified-origin feel for browser calls while keeping frontend and backend as independent processes.
