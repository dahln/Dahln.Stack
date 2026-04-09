These instructions cover deploying the Dahln.Stack application to a Linux server.

The application has a **decoupled architecture**:
- **Dahln.Stack.API** — a self-contained .NET binary (no .NET runtime required on the server)
- **Dahln.Stack.App** — a React SPA built with Vite, served as static files by Nginx
- **Nginx** — serves the React app and proxies `/api/*` requests to the API

Start by creating a Linux server. These instructions target Ubuntu x64 24.04. ARM64 builds are also available in each GitHub Release.

See [README.NGINX.md](README.NGINX.md) for additional Nginx configuration details.

## Install dependencies on the server

The API is self-contained, so .NET does **not** need to be installed on the server.

```
sudo apt update -y
```
```
sudo apt upgrade -y
```
```
sudo apt install -y unzip rsync nginx ufw
```
```
sudo ufw allow 'Nginx Full'
```
```
sudo ufw allow 'OpenSSH'
```
```
sudo ufw --force enable
```
Reboot the server.


## Setup application directories

Two separate directories — one for the API, one for the React app:
```
sudo mkdir -p /var/www/dahln-stack/api
```
```
sudo mkdir -p /var/www/dahln-stack/app
```
```
sudo chown -R $USER:$USER /var/www/dahln-stack
```

## Setup CI/CD

Fork or clone the repo. In your copy, setup GitHub repo secrets. These secrets are used to access the server via SSH during the CI/CD process. You will need the following secrets:
1. **SERVERADDRESS** — server IP or hostname
2. **SERVERPORT** — SSH port (default: 22. Use 22 unless your server uses another port for SSH)
3. **SERVERUSERNAME** — SSH user
4. **SERVERKEY** — SSH private key

The project uses two GitHub Actions workflows:
1. **cicd.yml** (`/.github/workflows/cicd.yml`) — triggers on push to `master`. Builds the API (x64 + ARM64) and React app, then creates a GitHub Release with all three zip artifacts.
2. **deploy.yml** (`/.github/workflows/deploy.yml`) — triggers when a release is published. Downloads the API x64 and App zips from the release, uploads them to the server, extracts, and restarts services. Can also be triggered manually for any past release tag.

Both workflow files are already in the repository. Push to `master` to trigger a build. When the release is published, the deploy workflow runs automatically.

The deploy action will fail on the first run because the Kestrel service hasn't been created yet.


## Create the Kestrel service

Create the service file on the server:
```
sudo nano /etc/systemd/system/kestrel-dahln-stack.service
```

Add this content:
```
[Unit]
Description=Dahln.Stack API

[Service]
WorkingDirectory=/var/www/dahln-stack/api
ExecStart=/var/www/dahln-stack/api/Dahln.Stack.API
Restart=always
RestartSec=10
KillSignal=SIGINT
SyslogIdentifier=dahln-stack-api
User=azureuser
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=ASPNETCORE_URLS=http://localhost:7001

[Install]
WantedBy=multi-user.target
```
Note: Adjust `User=azureuser` to match your server user. The `ExecStart` path points directly to the self-contained binary — no `dotnet` CLI needed.


## Enable the Kestrel service
```
sudo systemctl enable kestrel-dahln-stack.service
```
```
sudo systemctl restart kestrel-dahln-stack.service
```
```
sudo systemctl status kestrel-dahln-stack.service
```


## Create the Nginx configuration

Create the config file:
```
sudo nano /etc/nginx/sites-available/dahln-stack
```

Add the following contents. This serves the React app as static files and proxies `/api/*` to the .NET API:
```
server {
    server_name example.com;

    root /var/www/dahln-stack/app;
    index index.html;

    # Proxy API requests to Kestrel
    location /api/ {
        proxy_pass         http://127.0.0.1:7001/;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }

    # Serve static files, fall back to index.html for SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```
Replace `example.com` with your domain.


## Enable the Nginx configuration
```
sudo ln -s /etc/nginx/sites-available/dahln-stack /etc/nginx/sites-enabled/
```
```
sudo nginx -t
```
```
sudo systemctl restart nginx
```

## Setup your DNS
Create an 'A Record' where 'Host' equals your subdomain (or `@` for root) and the 'Value' equals the IP address of the server.


## Setup Let's Encrypt for SSL
```
sudo apt install -y certbot python3-certbot-nginx
```
```
sudo certbot --nginx -d example.com
```
Choose 'Redirect'. This will update the Nginx configuration to handle HTTPS.
```
sudo systemctl status certbot.timer
```
```
sudo certbot renew --dry-run
```

Replace `example.com` with your domain. Done — visit your domain to see the active site.


## Troubleshooting

```
sudo systemctl daemon-reload
```
```
sudo journalctl -u kestrel-dahln-stack.service
```
```
sudo nginx -t
```
```
sudo tail -f /var/log/nginx/error.log
```

