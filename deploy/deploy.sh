#!/usr/bin/env bash
# ============================================================
# LMBSC Hospitality Platform — Apache server deploy script
# Usage:  bash deploy/deploy.sh [--skip-db] [--skip-migrate]
# Run as: the mita user (or sudo where noted)
# ============================================================
set -euo pipefail

REPO_DIR="/home/mita/lmbsc"
VENV_DIR="/home/mita/.venv"
PUBLIC_HTML="/home/mita/public_html"
ENV_FILE="$REPO_DIR/.env.production"
SERVICE_NAME="lmbsc-api"

log()  { echo "[deploy] $*"; }
die()  { echo "[deploy] ERROR: $*" >&2; exit 1; }

# ── Parse flags ─────────────────────────────────────────────
SKIP_DB=false
SKIP_MIGRATE=false
for arg in "$@"; do
  case "$arg" in
    --skip-db)      SKIP_DB=true ;;
    --skip-migrate) SKIP_MIGRATE=true ;;
  esac
done

# ── Pre-flight checks ────────────────────────────────────────
[[ -f "$ENV_FILE" ]] || die "Missing $ENV_FILE — copy from deploy/.env.production.example and fill in secrets"

# ── 1. Pull latest code ──────────────────────────────────────
log "Pulling latest code..."
cd "$REPO_DIR"
git pull --ff-only

# ── 2. Python venv + dependencies ───────────────────────────
log "Installing Python dependencies..."
if [[ ! -d "$VENV_DIR" ]]; then
  python3.12 -m venv "$VENV_DIR"
fi
"$VENV_DIR/bin/pip" install --quiet --upgrade pip
"$VENV_DIR/bin/pip" install --quiet -e "$REPO_DIR/apps/api"

# ── 3. Install / refresh systemd service ────────────────────
log "Installing systemd service..."
sudo cp "$REPO_DIR/deploy/lmbsc-api.service" "/etc/systemd/system/$SERVICE_NAME.service"
sudo systemctl daemon-reload
sudo systemctl enable "$SERVICE_NAME"

# ── 4. Database setup (idempotent) ───────────────────────────
if [[ "$SKIP_DB" == false ]]; then
  log "Ensuring PostgreSQL database and user exist..."
  # Source env so we can read DB vars
  set -a; source "$ENV_FILE"; set +a

  # Extract host/user/pass/dbname from DATABASE_URL
  # Expected format: postgresql+asyncpg://USER:PASS@HOST/DBNAME
  DB_URL="${DATABASE_URL/postgresql+asyncpg:\/\//}"
  DB_USER="${DB_URL%%:*}"
  DB_URL="${DB_URL#*:}"
  DB_PASS="${DB_URL%%@*}"
  DB_URL="${DB_URL#*@}"
  DB_HOST="${DB_URL%%/*}"
  DB_NAME="${DB_URL#*/}"

  sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE ROLE $DB_USER WITH LOGIN PASSWORD '$DB_PASS';"
  sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
  # Enable TimescaleDB if available
  sudo -u postgres psql -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;" 2>/dev/null || \
    log "TimescaleDB not installed — skipping extension (install timescaledb-2-postgresql-16 if needed)"
fi

# ── 5. Run Alembic migrations ────────────────────────────────
if [[ "$SKIP_MIGRATE" == false ]]; then
  log "Running Alembic migrations..."
  cd "$REPO_DIR/apps/api"
  set -a; source "$ENV_FILE"; set +a
  "$VENV_DIR/bin/alembic" upgrade head
fi

# ── 6. Static site — copy root HTML to public_html ──────────
log "Syncing static site..."
rsync -av --exclude='.git' --exclude='apps/' --exclude='deploy/' \
  "$REPO_DIR/" "$PUBLIC_HTML/"

# ── 7. Apache config ─────────────────────────────────────────
log "Installing Apache VirtualHost..."
sudo cp "$REPO_DIR/deploy/apache/lamitabiciclista.conf" \
  "/etc/apache2/sites-available/lamitabiciclista.conf"

# Enable required Apache modules
sudo a2enmod proxy proxy_http headers rewrite ssl 2>/dev/null || true
sudo a2ensite lamitabiciclista 2>/dev/null || true

# ── 8. TLS via Let's Encrypt (first-time only) ───────────────
if [[ ! -d "/etc/letsencrypt/live/lamitabiciclista.ro" ]]; then
  log "Obtaining Let's Encrypt certificate..."
  sudo certbot --apache \
    -d lamitabiciclista.ro \
    -d www.lamitabiciclista.ro \
    -d app.lamitabiciclista.ro \
    --non-interactive --agree-tos \
    --email admin@lamitabiciclista.ro \
    --redirect
fi

# ── 9. Restart services ──────────────────────────────────────
log "Restarting FastAPI service..."
sudo systemctl restart "$SERVICE_NAME"

log "Reloading Apache..."
sudo apache2ctl configtest && sudo systemctl reload apache2

# ── 10. Smoke test ───────────────────────────────────────────
log "Smoke testing health endpoint..."
sleep 2
curl -sf http://127.0.0.1:8001/health | grep -q '"status":"ok"' && \
  log "Health check PASSED" || \
  die "Health check FAILED — check: sudo journalctl -u $SERVICE_NAME -n 50"

log "Deploy complete."
