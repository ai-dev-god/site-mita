#!/usr/bin/env python3
"""
LMBSC GitHub webhook receiver.

Listens on 127.0.0.1:9000. On a verified push event from GitHub,
runs deploy/deploy.sh --skip-install in the background.

Set WEBHOOK_SECRET in /home/aurel/mita/.env.production (or export it).
Register at: https://github.com/ai-dev-god/site-mita/settings/hooks
  Payload URL:  https://lamitabiciclista.ro/deploy
  Content type: application/json
  Secret:       <same value as WEBHOOK_SECRET>
  Events:       Just the push event
"""
import hashlib
import hmac
import http.server
import json
import logging
import os
import subprocess
import threading

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("webhook")

REPO_DIR = "/home/aurel/mita"
DEPLOY_SCRIPT = os.path.join(REPO_DIR, "deploy", "deploy.sh")
PORT = 9000
HOST = "127.0.0.1"
_deploy_lock = threading.Lock()


def _load_secret() -> str:
    """Read WEBHOOK_SECRET from env or .env.production file."""
    if "WEBHOOK_SECRET" in os.environ:
        return os.environ["WEBHOOK_SECRET"]
    env_file = os.path.join(REPO_DIR, ".env.production")
    if os.path.exists(env_file):
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if line.startswith("WEBHOOK_SECRET="):
                    return line.split("=", 1)[1].strip().strip('"').strip("'")
    return ""


def _verify_signature(body: bytes, header: str, secret: str) -> bool:
    if not secret:
        log.warning("WEBHOOK_SECRET not set — accepting all requests (insecure)")
        return True
    expected = "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(header, expected)


def _run_deploy():
    if not _deploy_lock.acquire(blocking=False):
        log.info("Deploy already running — skipping")
        return
    try:
        log.info("Starting deploy")
        result = subprocess.run(
            ["bash", DEPLOY_SCRIPT, "--skip-install"],
            capture_output=True,
            text=True,
            cwd=REPO_DIR,
        )
        if result.returncode == 0:
            log.info("Deploy succeeded")
        else:
            log.error("Deploy failed (exit %d):\n%s", result.returncode, result.stderr)
    finally:
        _deploy_lock.release()


class WebhookHandler(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path != "/deploy":
            self._respond(404, "not found")
            return

        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)
        sig = self.headers.get("X-Hub-Signature-256", "")
        secret = _load_secret()

        if not _verify_signature(body, sig, secret):
            log.warning("Invalid signature — rejected")
            self._respond(403, "forbidden")
            return

        try:
            payload = json.loads(body)
        except json.JSONDecodeError:
            self._respond(400, "bad json")
            return

        ref = payload.get("ref", "")
        if ref != "refs/heads/main":
            self._respond(200, f"ignoring ref {ref}")
            return

        threading.Thread(target=_run_deploy, daemon=True).start()
        self._respond(200, "deploying")

    def _respond(self, code: int, msg: str):
        self.send_response(code)
        self.send_header("Content-Type", "text/plain")
        self.end_headers()
        self.wfile.write((msg + "\n").encode())

    def log_message(self, fmt, *args):
        pass  # suppress per-request stdout noise


if __name__ == "__main__":
    server = http.server.HTTPServer((HOST, PORT), WebhookHandler)
    log.info("Webhook server listening on %s:%d/deploy", HOST, PORT)
    server.serve_forever()
