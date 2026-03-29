#!/usr/bin/env bash
# ============================================================
# LMBSC — One-time server firewall setup for GitHub Actions CD
#
# Run once as root (or with sudo) on the production server.
# Purpose: allow GitHub Actions runners to SSH in on port 22.
#
# SSH security is provided by the key pair, not a hidden port.
# The mita user's SSH is key-only (no password auth).
# ============================================================
set -euo pipefail

echo "==> Enabling UFW if not already active"
ufw --force enable

echo "==> Allowing SSH (port 22) from anywhere"
# GitHub Actions uses thousands of rotating CIDRs — static
# allowlisting is not practical. We rely on key-based auth.
ufw allow 22/tcp comment "SSH for GitHub Actions CD"

echo "==> Allowing HTTP and HTTPS"
ufw allow 80/tcp  comment "HTTP"
ufw allow 443/tcp comment "HTTPS"

echo "==> Current UFW status"
ufw status verbose

echo ""
echo "Done. Port 22 is now open."
echo "Verify SSH key-only auth is enforced in /etc/ssh/sshd_config:"
echo "  PasswordAuthentication no"
echo "  PubkeyAuthentication yes"
echo ""
echo "Once this runs, trigger a deploy from:"
echo "  https://github.com/ai-dev-god/site-mita/actions/workflows/deploy.yml"
