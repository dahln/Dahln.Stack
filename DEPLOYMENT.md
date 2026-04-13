These instructions cover deploying the Dahln.Stack application to a Linux server.

The application has a **decoupled architecture**:
- **Dahln.Stack.API** - a self-contained .NET binary (no .NET runtime required on the server)
- **Dahln.Stack.App** - a React SPA built with Vite, served as static files by Nginx
- **Nginx** - serves the React app and proxies `/api/*` requests to the API

The `install.sh` script automates the entire setup: dependencies, firewall, downloading the latest release, deploying the API and app, configuring the Kestrel service, Nginx, and SSL.

These instructions target Ubuntu x64 24.04. ARM64 is also supported automatically.

See [README.NGINX.md](README.NGINX.md) for additional Nginx configuration details.


## 1. Create a server and configure DNS

Create a Linux server (e.g. Ubuntu 24.04). In your domain registrar, create an **A Record** where **Host** equals your subdomain (or `@` for root) and **Value** equals the IP address of the server.

Allow DNS to propagate before proceeding - this is required for SSL certificate provisioning.


## 2. Connect to the server

```
ssh user@your-server-ip
```

## 3. Download and run the install script in one command

```
curl -fsSL https://raw.githubusercontent.com/dahln/Dahln.Stack/master/install.sh | sudo bash -s -- --domain example.com
```
Replace `example.com` with your domain. The script will:
- Install all dependencies (nginx, ufw, unzip, rsync, curl, jq)
- Configure the firewall
- Download the latest release from GitHub
- Deploy the API and React app
- Create and start the Kestrel service
- Configure Nginx
- Provision an SSL certificate via Let's Encrypt


## 4. Reboot

```
sudo reboot
```

Visit your domain to see the active site.


## Updating

To update to the latest release, run the installer again - no flags needed:
```
curl -fsSL https://raw.githubusercontent.com/dahln/Dahln.Stack/master/install.sh | sudo bash
```
The script is idempotent. It will download the latest release, redeploy, and restart services. Existing SSL configuration is preserved.


## Automation (optional)

Fork or clone the repo. In your copy, setup GitHub repo secrets for SSH access:
1. **SERVERADDRESS** - server IP or hostname
2. **SERVERPORT** - SSH port (default: 22)
3. **SERVERUSERNAME** - SSH user
4. **SERVERKEY** - SSH private key

The project uses two GitHub Actions workflows:
1. **BuildReleasePackages.yml** - triggers on push to `master`. Builds the API (x64 + ARM64) and React app, then creates a GitHub Release package set.
2. **deploy.yml** - triggers when a release is published. Downloads artifacts, deploys to the server, and restarts services. Can also be triggered manually for any past release tag.


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

