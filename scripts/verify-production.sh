#!/usr/bin/env bash
set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "=========================================="
echo " DevChat Production Verification Pipeline "
echo "=========================================="

echo ""
echo "[Step 1/5] Checking for forbidden em dashes across repository..."
if grep -rn -E "[—–]" --exclude-dir={node_modules,.next,.git,.agents,scripts} .; then
    echo "FAILED: Found forbidden em dashes above. Fix before proceeding."
    exit 1
else
    echo "PASSED: Zero em dashes found."
fi

echo ""
echo "[Step 2/5] Auditing for leaked secrets and private credentials..."
TRACKED_ENVS=$(git ls-files | grep -E "(^|/)\.env($|\.local$|\.production$)" || true)
if [ -n "$TRACKED_ENVS" ]; then
    echo "FAILED: Found tracked private .env files in git: $TRACKED_ENVS"
    exit 1
fi

if grep -rn -E "BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY" --exclude-dir={node_modules,.next,.git,scripts} .; then
    echo "FAILED: Leaked private key detected in repository."
    exit 1
fi

if grep -rn -E "(sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{20,}|AKIA[0-9A-Z]{16})" --exclude-dir={node_modules,.next,.git,scripts} .; then
    echo "FAILED: Leaked live API token detected in repository."
    exit 1
fi
echo "PASSED: Zero leaked secrets or credentials."

echo ""
echo "[Step 3/5] Verifying Cloudflare & HTTP security headers..."
if ! grep -q "Strict-Transport-Security" client/next.config.js || \
   ! grep -q "Content-Security-Policy" client/next.config.js || \
   ! grep -q "X-Frame-Options" client/next.config.js || \
   ! grep -q "X-Content-Type-Options" client/next.config.js; then
    echo "FAILED: Missing required security headers in client/next.config.js."
    exit 1
fi
echo "PASSED: Security headers fully configured."

echo ""
echo "[Step 4/5] Auditing client and server dependencies..."
npm --prefix client audit
npm --prefix server audit
echo "PASSED: 0 dependency vulnerabilities found."

echo ""
echo "[Step 5/5] Building Next.js client production bundle..."
npm --prefix client run build

echo ""
echo "=========================================="
echo " ALL PRODUCTION CHECKS PASSED (0 ERRORS)  "
echo "=========================================="
exit 0
