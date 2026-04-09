#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Dahln.Stack Install / Update Script
#
# Usage:
#   First-time setup:  sudo ./install.sh --domain example.com
#   Update only:       sudo ./install.sh
#   Force SSL setup:   sudo ./install.sh --domain example.com --ssl
#
# This script is idempotent and can be run repeatedly.
# =============================================================================

REPO="dahln/BlazorWasmAndApiTemplate"
API_DIR="/var/www/dahln-stack/api"
APP_DIR="/var/www/dahln-stack/app"
SERVICE_NAME="kestrel-dahln-stack"
NGINX_SITE="dahln-stack"
API_PORT="7001"

DOMAIN=""
FORCE_SSL=false
ARCH="x64"

# Detect architecture
case "$(uname -m)" in
    aarch64|arm64) ARCH="arm64" ;;
    x86_64)        ARCH="x64" ;;
    *)
        echo "Unsupported architecture: $(uname -m)"
        exit 1
        ;;
esac

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        --domain)
            DOMAIN="$2"
            shift 2
            ;;
        --ssl)
            FORCE_SSL=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: sudo ./install.sh [--domain example.com] [--ssl]"
            exit 1
            ;;
    esac
done

# Must run as root
if [[ $EUID -ne 0 ]]; then
    echo "This script must be run as root (use sudo)."
    exit 1
fi

# Resolve the non-root user who invoked sudo
RUN_USER="${SUDO_USER:-$USER}"

echo "============================================"
echo " Dahln.Stack Installer"
echo " Architecture: linux-${ARCH}"
echo " Domain:       ${DOMAIN:-'(not set)'}"
echo "============================================"
echo ""

# ─── 1. Install Dependencies ─────────────────────────────────────────────────

echo ">>> [1/6] Installing dependencies..."
apt-get update -y
apt-get install -y unzip rsync nginx ufw curl jq

# Configure firewall (idempotent)
ufw allow 'Nginx Full' >/dev/null 2>&1 || true
ufw allow 'OpenSSH' >/dev/null 2>&1 || true
ufw --force enable >/dev/null 2>&1 || true

echo "    Dependencies installed."
echo ""

# ─── 2. Download Latest Release ──────────────────────────────────────────────

echo ">>> [2/6] Downloading latest release from GitHub..."

RELEASE_JSON=$(curl -sf "https://api.github.com/repos/${REPO}/releases/latest")
TAG_NAME=$(echo "$RELEASE_JSON" | jq -r '.tag_name')

if [[ -z "$TAG_NAME" || "$TAG_NAME" == "null" ]]; then
    echo "    ERROR: Could not find a release in ${REPO}."
    exit 1
fi

echo "    Latest release: ${TAG_NAME}"

# Find asset URLs
API_URL=$(echo "$RELEASE_JSON" | jq -r \
    ".assets[] | select(.name | test(\"API.*${ARCH}.*\\\\.zip$\")) | .browser_download_url")
APP_URL=$(echo "$RELEASE_JSON" | jq -r \
    '.assets[] | select(.name | test("App.*\\.zip$")) | .browser_download_url')

if [[ -z "$API_URL" ]]; then
    echo "    ERROR: No API ${ARCH} zip found in release ${TAG_NAME}."
    exit 1
fi
if [[ -z "$APP_URL" ]]; then
    echo "    ERROR: No App zip found in release ${TAG_NAME}."
    exit 1
fi

TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

echo "    Downloading API (${ARCH})..."
curl -sfL -o "${TMPDIR}/api.zip" "$API_URL"

echo "    Downloading App..."
curl -sfL -o "${TMPDIR}/app.zip" "$APP_URL"

echo "    Downloads complete."
echo ""

# ─── 3. Deploy Packages ──────────────────────────────────────────────────────

echo ">>> [3/6] Deploying packages..."

# API
mkdir -p "${TMPDIR}/api_staging"
unzip -qo "${TMPDIR}/api.zip" -d "${TMPDIR}/api_staging"
mkdir -p "$API_DIR"
rsync -a --delete --exclude='*.db' --exclude='data/' "${TMPDIR}/api_staging/" "${API_DIR}/"
chmod +x "${API_DIR}/Dahln.Stack.API"

# App
mkdir -p "${TMPDIR}/app_staging"
unzip -qo "${TMPDIR}/app.zip" -d "${TMPDIR}/app_staging"
mkdir -p "$APP_DIR"
rsync -a --delete "${TMPDIR}/app_staging/" "${APP_DIR}/"

chown -R "${RUN_USER}:${RUN_USER}" /var/www/dahln-stack

echo "    API deployed to ${API_DIR}"
echo "    App deployed to ${APP_DIR}"
echo ""

# ─── 4. Setup / Update Kestrel Service ───────────────────────────────────────

echo ">>> [4/6] Configuring Kestrel service..."

SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=Dahln.Stack API

[Service]
WorkingDirectory=${API_DIR}
ExecStart=${API_DIR}/Dahln.Stack.API
Restart=always
RestartSec=10
KillSignal=SIGINT
SyslogIdentifier=dahln-stack-api
User=${RUN_USER}
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=ASPNETCORE_URLS=http://localhost:${API_PORT}

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable "${SERVICE_NAME}.service" >/dev/null 2>&1
systemctl restart "${SERVICE_NAME}.service"

echo "    Kestrel service active."
echo ""

# ─── 5. Setup / Update Nginx ─────────────────────────────────────────────────

echo ">>> [5/6] Configuring Nginx..."

NGINX_CONF="/etc/nginx/sites-available/${NGINX_SITE}"
SERVER_NAME="${DOMAIN:-_}"

# Only write the Nginx config if it doesn't exist yet, or if no SSL block is
# present (avoids overwriting a certbot-modified config on updates).
if [[ ! -f "$NGINX_CONF" ]] || ! grep -q "ssl_certificate" "$NGINX_CONF"; then
    cat > "$NGINX_CONF" <<EOF
server {
    listen 80;
    server_name ${SERVER_NAME};

    root ${APP_DIR};
    index index.html;

    # Proxy API requests to Kestrel
    location /api/ {
        proxy_pass         http://127.0.0.1:${API_PORT}/;
        proxy_http_version 1.1;
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
    }

    # Serve static files, fall back to index.html for SPA routing
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF
    echo "    Nginx config written."
else
    echo "    Nginx config already has SSL — skipping overwrite."
fi

# Enable site (idempotent)
if [[ ! -L "/etc/nginx/sites-enabled/${NGINX_SITE}" ]]; then
    ln -s "$NGINX_CONF" "/etc/nginx/sites-enabled/${NGINX_SITE}"
fi

# Remove default site if present to avoid conflicts
if [[ -L "/etc/nginx/sites-enabled/default" ]]; then
    rm -f "/etc/nginx/sites-enabled/default"
fi

nginx -t
systemctl restart nginx

echo "    Nginx configured and restarted."
echo ""

# ─── 6. SSL Certificate (optional) ───────────────────────────────────────────

echo ">>> [6/6] SSL certificate..."

SSL_NEEDED=false

if [[ "$FORCE_SSL" == true ]]; then
    SSL_NEEDED=true
fi

# Auto-detect: if a domain is set and certbot hasn't been run yet
if [[ -n "$DOMAIN" && "$DOMAIN" != "_" ]] && ! grep -q "ssl_certificate" "$NGINX_CONF" 2>/dev/null; then
    SSL_NEEDED=true
fi

if [[ "$SSL_NEEDED" == true ]]; then
    if [[ -z "$DOMAIN" || "$DOMAIN" == "_" ]]; then
        echo "    ERROR: --domain is required for SSL setup."
        echo "    Re-run with: sudo ./install.sh --domain example.com --ssl"
        exit 1
    fi

    echo "    Setting up SSL for ${DOMAIN}..."
    apt-get install -y certbot python3-certbot-nginx
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --redirect --register-unsafely-without-email

    echo "    Verifying certbot auto-renewal..."
    systemctl enable certbot.timer >/dev/null 2>&1 || true
    certbot renew --dry-run

    echo "    SSL configured for ${DOMAIN}."
else
    if [[ -n "$DOMAIN" ]] && grep -q "ssl_certificate" "$NGINX_CONF" 2>/dev/null; then
        echo "    SSL already configured — skipping."
    else
        echo "    Skipped (no --domain provided or SSL already set up)."
        echo "    To enable SSL later: sudo ./install.sh --domain example.com --ssl"
    fi
fi

echo ""
echo "============================================"
echo " Dahln.Stack deployment complete!"
echo " Release: ${TAG_NAME}"
if [[ -n "$DOMAIN" && "$DOMAIN" != "_" ]]; then
    echo " URL:     https://${DOMAIN}"
else
    echo " URL:     http://<server-ip>"
fi
echo "============================================"
