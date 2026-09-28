#!/usr/bin/env bash
# Fetches the official Wavelength WASM runtime asset set for this app's
# pinned @lightninglabs/wavelength-web version, from the matching
# lightninglabs/wavelength GitHub release. Does NOT build anything locally
# -- same provenance as Slice A's validated runtime.
#
# Solves two things flagged in docs/security/slice-b-pass4-review.md:
# - N12: a clean clone couldn't run this app because the runtime assets
#   (gitignored, ~150MB) had no fetch script or runbook.
# - The reviewer's version-drift note under "On the two documented SDK
#   integration fixes": the runtime version was hardcoded separately in
#   src/main.tsx and in the manual curl command used to stage it. This
#   script reads the version from package.json instead, so there is only
#   one place version drift can happen (src/main.tsx), not two.
#
# Usage: ./scripts/fetch-runtime.sh
set -euo pipefail
cd "$(dirname "$0")/.."

VERSION="$(node -p "require('./package.json').dependencies['@lightninglabs/wavelength-web']")"
DEST="public/wavewalletdk/${VERSION}"
URL="https://github.com/lightninglabs/wavelength/releases/download/v${VERSION}/Wavewalletdk.wasm.tar.gz"

if [ -f "${DEST}/wavewalletdk.wasm" ]; then
  echo "Runtime assets for v${VERSION} already present at ${DEST}/ -- nothing to do."
  echo "Delete that directory first if you want to re-fetch."
  exit 0
fi

echo "Fetching official Wavelength v${VERSION} runtime assets..."
mkdir -p "${DEST}"
TMP="$(mktemp)"
curl -fsSL -o "${TMP}" "${URL}"
tar -xzf "${TMP}" -C "${DEST}"
rm -f "${TMP}"

echo "Staged into ${DEST}/:"
ls -la "${DEST}"

echo
echo "IMPORTANT: src/main.tsx hardcodes this version in its runtimeBaseUrl"
echo "path. If you bumped the SDK version, update src/main.tsx to match,"
echo "or the app will point at a runtime that doesn't exist."
