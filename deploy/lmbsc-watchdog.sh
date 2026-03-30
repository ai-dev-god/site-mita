#!/usr/bin/env bash
# LMBSC Watchdog — checks public URL and restarts services if down
# Installed as cron: */5 * * * * /home/aurel/mita/deploy/lmbsc-watchdog.sh >> /var/log/lmbsc-watchdog.log 2>&1

set -euo pipefail

HEALTHCHECK_URL="https://app.lamitabiciclista.ro/hospitality"
API_HEALTH_URL="https://app.lamitabiciclista.ro/health"
LOG_TAG="[lmbsc-watchdog]"
RESTART_FLAG="/tmp/lmbsc-watchdog-restarted"

log() { echo "$(date -u '+%Y-%m-%dT%H:%M:%SZ') $LOG_TAG $*"; }

check_url() {
    local url="$1"
    local http_code
    http_code=$(curl -sf -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "000")
    echo "$http_code"
}

# Check frontend
web_code=$(check_url "$HEALTHCHECK_URL")
api_code=$(check_url "$API_HEALTH_URL")

web_ok=false
api_ok=false

[[ "$web_code" == "200" || "$web_code" == "308" ]] && web_ok=true
[[ "$api_code" == "200" ]] && api_ok=true

if $web_ok && $api_ok; then
    log "OK — web=$web_code api=$api_code"
    rm -f "$RESTART_FLAG"
    exit 0
fi

# Something is down
log "DOWN — web=$web_code api=$api_code — restarting services"

if ! $api_ok; then
    log "Restarting lmbsc-api..."
    sudo systemctl restart lmbsc-api || log "ERROR: failed to restart lmbsc-api"
    sleep 3
fi

if ! $web_ok; then
    log "Restarting lmbsc-web..."
    sudo systemctl restart lmbsc-web || log "ERROR: failed to restart lmbsc-web"
    sleep 5
fi

# Re-check after restart
web_code_after=$(check_url "$HEALTHCHECK_URL")
api_code_after=$(check_url "$API_HEALTH_URL")
log "POST-RESTART — web=$web_code_after api=$api_code_after"

touch "$RESTART_FLAG"
