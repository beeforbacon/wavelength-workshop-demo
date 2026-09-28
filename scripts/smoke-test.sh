#!/usr/bin/env bash
# Smoke-tests that the dev server actually serves a bootable app -- catches
# the class of bug that broke this app twice during Slice B (see
# docs/validation/slice-b-verification.md #2 and the SDK integration bugs
# noted there): Vite's dependency pre-bundler mis-resolving the SDK's
# worker file, and runtime asset files failing to serve.
#
# LIMITATION, stated plainly: this is curl-only, no headless browser. It
# checks that the SERVER serves the right files with the right
# content-types and headers. It does NOT execute any JavaScript, so it
# CANNOT catch a client-side runtime error (for example, the
# "URL constructor: ... is not a valid URL" bug from an incorrect
# runtimeBaseUrl value) -- that class of bug only surfaces in an actual
# browser console. Catching that class of bug for real would need a
# headless browser (e.g. Playwright), which is a new dependency and its
# own approval decision -- deliberately not added here.
#
# Usage: ./scripts/smoke-test.sh (starts its own server if one isn't
# already running on the configured port, and stops it again after).
set -uo pipefail
cd "$(dirname "$0")/.."

PORT="$(grep -oP "port:\s*\K[0-9]+" vite.config.ts | head -1)"
if [ -z "${PORT}" ]; then
  echo "Could not determine dev server port from vite.config.ts" >&2
  exit 1
fi

BASE="http://localhost:${PORT}"
STARTED_SERVER=0
FAILED=0

check() {
  local desc="$1"; shift
  if "$@"; then
    echo "  OK   ${desc}"
  else
    echo "  FAIL ${desc}"
    FAILED=1
  fi
}

http_status_is() {
  local url="$1" expected="$2"
  local status
  status="$(curl -s -o /dev/null -w '%{http_code}' "${url}")"
  [ "${status}" = "${expected}" ]
}

header_present() {
  local url="$1" header="$2" value="$3"
  curl -s -D - -o /dev/null "${url}" | grep -qi "^${header}: ${value}"
}

content_type_is() {
  local url="$1" expected="$2"
  curl -s -D - -o /dev/null "${url}" | grep -qi "^Content-Type: ${expected}"
}

# Start a server if one isn't already up.
if ! curl -s -o /dev/null "${BASE}"; then
  echo "No server running on port ${PORT}, starting one..."
  pnpm dev > /tmp/wallet-mvp-smoke-test.log 2>&1 &
  SERVER_PID=$!
  STARTED_SERVER=1
  for i in $(seq 1 30); do
    curl -s -o /dev/null "${BASE}" && break
    sleep 0.5
  done
fi

echo "Smoke-testing ${BASE} ..."

check "index page loads (200)" http_status_is "${BASE}/" "200"
check "COOP header present" header_present "${BASE}/" "Cross-Origin-Opener-Policy" "same-origin"
check "COEP header present" header_present "${BASE}/" "Cross-Origin-Embedder-Policy" "require-corp"
check "CORP header present" header_present "${BASE}/" "Cross-Origin-Resource-Policy" "same-origin"

VERSION="$(node -p "require('./package.json').dependencies['@lightninglabs/wavelength-web']")"
check "runtime wasm.gz asset serves (200)" http_status_is \
  "${BASE}/wavewalletdk/${VERSION}/wavewalletdk.wasm.gz" "200"
check "runtime wasm_exec.js asset serves (200)" http_status_is \
  "${BASE}/wavewalletdk/${VERSION}/wasm_exec.js" "200"

# Find the pnpm-resolved worker chunk path the same way the app's own
# bundle resolves it, and confirm it is served as real JS, not the index.html
# SPA fallback (the exact failure mode from the Vite pre-bundling bug).
WORKER_LINE="$(curl -s "${BASE}/node_modules/@lightninglabs/wavelength-web/dist/clients/worker.js" \
  | grep -o '"/node_modules/\.pnpm/[^"]*wavewalletdk-worker\.js[^"]*"' | head -1 | tr -d '"')"
if [ -n "${WORKER_LINE}" ]; then
  check "worker chunk serves as JS, not HTML fallback" content_type_is \
    "${BASE}${WORKER_LINE}" "text/javascript"
else
  echo "  FAIL worker chunk path could not be resolved from worker.js"
  FAILED=1
fi

if [ "${STARTED_SERVER}" = "1" ]; then
  kill "${SERVER_PID}" 2>/dev/null || true
fi

if [ "${FAILED}" = "1" ]; then
  echo "Smoke test FAILED."
  exit 1
fi
echo "Smoke test passed (server-side checks only -- see script header for what this cannot catch)."
