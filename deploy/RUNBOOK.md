# LMBSC Ops Runbook

## Quick reference

| Service | Systemd unit | Port |
|---|---|---|
| FastAPI backend | `lmbsc-api` | `127.0.0.1:8001` |
| Next.js frontend | `lmbsc-web` | `127.0.0.1:3000` |
| PostgreSQL 16 | `postgresql` | `127.0.0.1:5432` |
| Redis 7 | `redis-server` | `127.0.0.1:6379` |
| Apache | `apache2` | `80 / 443` |

---

## Monitoring & alerting

### Error tracking — Sentry

Both the FastAPI backend and Next.js frontend report unhandled exceptions to Sentry.

- **Backend project:** configured via `SENTRY_DSN` in `.env.production`
- **Frontend project:** configured via `NEXT_PUBLIC_SENTRY_DSN` in `.env.production`

New errors appear in the Sentry dashboard within ~60 seconds of occurring in production.

### Uptime monitoring — UptimeRobot

Configure UptimeRobot (free tier) to monitor:

| Check | URL | Alert if down > |
|---|---|---|
| API health | `https://app.lamitabiciclista.ro/api/health` (proxied) or direct `http://<server>:8001/health` | 2 min |
| Frontend | `https://app.lamitabiciclista.ro/hospitality` | 2 min |

Set alert contacts to Telegram and/or email in the UptimeRobot dashboard. The health endpoint returns HTTP 200 with `{"status":"ok"}` when all checks pass, or `{"status":"degraded"}` if DB or Redis is unhealthy.

### Health endpoint

```
GET /health
```

Response:
```json
{"status": "ok", "version": "0.1.0", "checks": {"db": "ok", "redis": "ok"}}
```

`status` is `"ok"` when all checks pass, `"degraded"` when one or more fail. Always returns HTTP 200 so UptimeRobot must check the body, not just the status code.

---

## Where are the logs?

```bash
# FastAPI (structlog JSON lines)
sudo journalctl -u lmbsc-api -f

# Next.js
sudo journalctl -u lmbsc-web -f

# Apache access/error
sudo tail -f /var/log/apache2/lamitabiciclista-access.log
sudo tail -f /var/log/apache2/lamitabiciclista-error.log

# PostgreSQL
sudo journalctl -u postgresql -f

# Redis
sudo journalctl -u redis-server -f
```

Every request log line from the FastAPI service includes a `request_id` field. To trace a specific request:

```bash
sudo journalctl -u lmbsc-api | grep '"request_id":"<uuid>"'
```

The `X-Request-Id` header is echoed back in all API responses — use it to correlate frontend errors with backend logs.

---

## How to restart services

```bash
# Restart the API (e.g. after a config change)
sudo systemctl restart lmbsc-api

# Restart the frontend
sudo systemctl restart lmbsc-web

# Restart both + reload Apache
sudo systemctl restart lmbsc-api lmbsc-web && sudo systemctl reload apache2

# Check status
sudo systemctl status lmbsc-api lmbsc-web
```

---

## How to roll back a bad deploy

```bash
cd /home/aurel/mita

# Find the last good commit
git log --oneline -10

# Check out the previous commit
git checkout <commit-hash>

# Re-run the deploy script (skips apt installs, skips DB create)
bash deploy/deploy.sh --skip-install --skip-db
```

If migrations need to be rolled back:

```bash
source .env.production
cd apps/api
/home/aurel/.venv/bin/alembic downgrade -1
```

---

## Common failure scenarios

### API is down / 502 from Apache

1. Check service status: `sudo systemctl status lmbsc-api`
2. Check logs: `sudo journalctl -u lmbsc-api -n 50`
3. Check health: `curl http://127.0.0.1:8001/health`
4. If DB is the issue (`"db":"error"` in health), check PostgreSQL: `sudo systemctl status postgresql`
5. If Redis is the issue, check Redis: `sudo systemctl status redis-server`

### Database connection errors

```bash
sudo systemctl status postgresql
sudo -u postgres psql -c "\l"  # list databases
sudo -u postgres psql -d lmbsc_db -c "SELECT count(*) FROM information_schema.tables;"
```

### Redis connection errors

```bash
sudo systemctl status redis-server
redis-cli ping  # should return PONG
```

### Frontend build fails after deploy

```bash
cd /home/aurel/mita/apps/web
npm ci
npm run build 2>&1 | tail -30
```

### Celery worker stuck / tasks not running

```bash
# Check worker is running (Celery runs as part of lmbsc-api or a separate unit if added)
redis-cli keys "celery*"  # pending tasks in Redis
```

---

## Environment file

Located at `/home/aurel/mita/.env.production`. Required secrets:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `SECRET_KEY` | App secret (32+ chars) |
| `PII_ENCRYPTION_KEY` | AES-256 key for PII fields |
| `CLERK_PUBLISHABLE_KEY` | Clerk frontend key |
| `CLERK_SECRET_KEY` | Clerk server key |
| `CLERK_FRONTEND_API` | Clerk frontend API domain |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `SENTRY_DSN` | Sentry DSN for FastAPI |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN for Next.js frontend |
| `TWILIO_ACCOUNT_SID` | Twilio SID for SMS notifications |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_FROM_NUMBER` | Twilio sender number |
| `RESEND_API_KEY` | Resend API key for email |

After editing `.env.production`, restart affected services:

```bash
sudo systemctl restart lmbsc-api lmbsc-web
```
