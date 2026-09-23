#!/usr/bin/env bash
set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "=========================================="
echo " DevChat Production Verification Pipeline "
echo "=========================================="

echo ""
echo "[Step 1/4] Checking for forbidden em dashes across repository..."
if grep -rn -E "[—–]" --exclude-dir={node_modules,.next,.git,.agents,scripts} .; then
    echo "FAILED: Found forbidden em dashes above. Fix before proceeding."
    exit 1
else
    echo "PASSED: Zero em dashes found."
fi

echo ""
echo "[Step 2/4] Auditing client dependencies..."
npm --prefix client audit

echo ""
echo "[Step 3/4] Auditing server dependencies..."
npm --prefix server audit

echo ""
echo "[Step 4/4] Building Next.js client production bundle..."
npm --prefix client run build

echo ""
echo "=========================================="
echo " ALL PRODUCTION CHECKS PASSED (0 ERRORS)  "
echo "=========================================="
exit 0
