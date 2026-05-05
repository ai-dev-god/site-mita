#!/usr/bin/env bash
# ============================================================
# LMBSC Local Deploy
#
# Runs on the production machine after a git push.
# Does NOT do git pull — code is already at /home/aurel/mita.
#
# Usage:
#   bash deploy/local-deploy.sh
#   bash deploy/local-deploy.sh --skip-frontend  # skip npm build
#   bash deploy/local-deploy.sh --skip-migrate   # skip alembic
# ============================================================
set -euo pipefail

REPO_DIR="/home/aurel/mita"
VENV_DIR="/home/aurel/.venv"
PUBLIC_HTML="/home/aurel/public_html"

log() { echo "[deploy] $*"; }
die() { echo "[deploy] ERROR: $*" >&2; exit 1; }

SKIP_FRONTEND=false
SKIP_MIGRATE=false
for arg in "$@"; do
  case "$arg" in
    --skip-frontend) SKIP_FRONTEND=true ;;
    --skip-migrate)  SKIP_MIGRATE=true ;;
  esac
done

cd "$REPO_DIR"

# ── Python venv ──────────────────────────────────────────────
log "Installing Python dependencies..."
if [ ! -d "$VENV_DIR" ]; then
  python3 -m venv "$VENV_DIR"
fi
"$VENV_DIR/bin/pip" install --quiet --upgrade pip
"$VENV_DIR/bin/pip" install --quiet -e "$REPO_DIR/apps/api"

# ── Alembic migrations ───────────────────────────────────────
if [[ "$SKIP_MIGRATE" == false ]]; then
  log "Running Alembic migrations..."
  cd "$REPO_DIR/apps/api"
  # Use python-dotenv safe parsing — avoids bash mangling JSON values
  DATABASE_URL=$(python3 -c "
import re, sys
env_file = '$REPO_DIR/.env.production'
try:
    with open(env_file) as f:
        for line in f:
            line = line.strip()
            if line.startswith('DATABASE_URL='):
                print(line.split('=', 1)[1].strip('\"').strip(\"'\"))
                sys.exit(0)
except FileNotFoundError:
    pass
" 2>/dev/null)
  if [ -n "$DATABASE_URL" ]; then
    export DATABASE_URL
  fi
  "$VENV_DIR/bin/alembic" upgrade head
  cd "$REPO_DIR"
fi

# ── Next.js frontend build ───────────────────────────────────
if [[ "$SKIP_FRONTEND" == false ]]; then
  log "Building Next.js frontend..."
  cd "$REPO_DIR/apps/web"
  npm install --include=dev
  npm run build
  cp -r public .next/standalone/public
  cp -r .next/static .next/standalone/.next/static
  cd "$REPO_DIR"
fi

# ── Static marketing site ────────────────────────────────────
log "Syncing static marketing site..."
mkdir -p "$PUBLIC_HTML"
rsync -a --delete \
  --exclude='.git' \
  --exclude='apps/' \
  --exclude='deploy/' \
  --exclude='.github/' \
  --exclude='.stitch/' \
  --exclude='.env*' \
  "$REPO_DIR/" "$PUBLIC_HTML/"

# ── lamitabiciclista.ro apex (cPanel docroot of mita user) ──
# Apex serves from /home/mita/public_html/ (cPanel ServerName lamitabiciclista.ro).
# Push only the static landing assets — NOT the whole repo, the mita user's
# docroot is not a generic public_html mirror like aurel's.
MITA_DOCROOT="/home/mita/public_html"
log "Syncing apex landing -> $MITA_DOCROOT..."
sudo rsync -a "$REPO_DIR/index.html" "$MITA_DOCROOT/index.html"
sudo rsync -a --delete "$REPO_DIR/assets/" "$MITA_DOCROOT/assets/"
sudo rsync -a --delete "$REPO_DIR/meniu/"  "$MITA_DOCROOT/meniu/"
sudo chown -R mita:mita "$MITA_DOCROOT/index.html" "$MITA_DOCROOT/assets" "$MITA_DOCROOT/meniu"

# ── bilete.lamitabiciclista.ro (cPanel sub of mita) ──────────
# Live docroot is /home/mita/public_html/bilete/ (cPanel-managed),
# not aurel's public_html. Sync via sudo, then chown to mita:mita
# so cPanel/Apache can serve it under the mita user.
BILETE_DOCROOT="/home/mita/public_html/bilete"
if [ -d "$REPO_DIR/marketing/bilete" ]; then
  log "Syncing marketing/bilete -> $BILETE_DOCROOT..."
  sudo mkdir -p "$BILETE_DOCROOT"
  sudo rsync -a --delete \
    --exclude='cgi-bin' \
    "$REPO_DIR/marketing/bilete/" "$BILETE_DOCROOT/"
  sudo chown -R mita:mita "$BILETE_DOCROOT"
fi

# ── Restart services ─────────────────────────────────────────
log "Restarting services..."
sudo systemctl restart lmbsc-api
sudo systemctl restart lmbsc-web

# ── Smoke test ───────────────────────────────────────────────
log "Smoke test..."
sleep 3
curl -sf http://127.0.0.1:8001/health | grep -q '"status":"ok"' && log "API health: OK"
curl -sf http://127.0.0.1:3001/hospitality -o /dev/null && log "Web health: OK"

log "Deploy complete."
