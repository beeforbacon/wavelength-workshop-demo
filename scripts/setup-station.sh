#!/usr/bin/env bash
# One-shot setup for a workshop "station" laptop: installs dependencies,
# fetches the pinned Wavelength WASM runtime, and starts the local dev
# server.
#
# This does NOT introduce any new project dependency, network service, or
# public exposure beyond what this app already needs. It runs the local
# Vite dev server (localhost only -- Wavelength requires a secure context
# for crypto.subtle and its cross-origin-isolation headers, so a LAN IP /
# http:// will NOT work; see README.md). Each laptop that runs this script
# gets its own fully independent wallet instance -- nothing here connects
# stations to each other. Signet payments between two stations' wallets
# are still done the normal way: read an invoice/address off one screen
# (or scan a QR) and paste/scan it into the other station.
#
# Usage:
#   ./scripts/setup-station.sh            # install + fetch runtime, then start dev server
#   ./scripts/setup-station.sh --no-start # install + fetch runtime only, don't start the server
#
# Missing-dependency handling: if git, Node.js, or pnpm are missing, this
# script does NOT just fail and quit. It tells you what's missing, offers
# to install it for you (macOS via Homebrew, Debian/Ubuntu via apt, or
# nvm as a fallback for Node), and then re-checks and continues --
# because this is meant to be handed to someone at a workshop table who
# may not have a dev environment set up, and a bare "command not found"
# isn't actionable for them.

set -uo pipefail
cd "$(dirname "$0")/.."

START_SERVER=1
if [ "${1:-}" = "--no-start" ]; then
  START_SERVER=0
fi

fail() {
  echo "ERROR: $1" >&2
  exit 1
}

ask_yes_no() {
  # ask_yes_no "prompt" -> 0 (yes) or 1 (no). Defaults to "no" on
  # non-interactive input (e.g. piped stdin) rather than silently installing.
  local prompt="$1" reply
  if [ ! -t 0 ]; then
    echo "${prompt} [non-interactive shell, assuming no]"
    return 1
  fi
  read -r -p "${prompt} [y/N] " reply
  case "${reply}" in
    [yY]|[yY][eE][sS]) return 0 ;;
    *) return 1 ;;
  esac
}

detect_os() {
  case "$(uname -s)" in
    Darwin) echo "macos" ;;
    Linux)
      if [ -f /etc/debian_version ]; then echo "debian"; else echo "linux-other"; fi
      ;;
    *) echo "unknown" ;;
  esac
}

OS="$(detect_os)"

# --- git ----------------------------------------------------------------

ensure_git() {
  if command -v git >/dev/null 2>&1; then return 0; fi
  echo "git is not installed."
  case "${OS}" in
    macos)
      if command -v brew >/dev/null 2>&1 && ask_yes_no "Install git now via Homebrew?"; then
        brew install git
      else
        echo "Install git yourself (e.g. via Xcode Command Line Tools: xcode-select --install,"
        echo "or from https://git-scm.com/downloads), then re-run this script."
      fi
      ;;
    debian)
      if ask_yes_no "Install git now via apt (may prompt for your sudo password)?"; then
        sudo apt-get update && sudo apt-get install -y git
      else
        echo "Install git yourself (sudo apt-get install git), then re-run this script."
      fi
      ;;
    *)
      echo "Install git from https://git-scm.com/downloads, then re-run this script."
      ;;
  esac
  command -v git >/dev/null 2>&1
}

# --- Node.js --------------------------------------------------------------

ensure_node() {
  if command -v node >/dev/null 2>&1; then
    local major
    major="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
    if [ "${major}" -ge 18 ]; then return 0; fi
    echo "Found Node.js v${major}.x, but 18+ is required."
  else
    echo "Node.js is not installed (18+ required)."
  fi
  case "${OS}" in
    macos)
      if command -v brew >/dev/null 2>&1 && ask_yes_no "Install a current Node.js now via Homebrew?"; then
        brew install node
      elif ask_yes_no "Install Node.js now via nvm (Node Version Manager)?"; then
        install_node_via_nvm
      else
        echo "Install Node.js 18+ yourself from https://nodejs.org/, then re-run this script."
      fi
      ;;
    debian)
      if ask_yes_no "Install Node.js now via nvm (Node Version Manager)?"; then
        install_node_via_nvm
      else
        echo "Install Node.js 18+ yourself (e.g. via nvm or https://nodejs.org/), then re-run this script."
      fi
      ;;
    *)
      echo "Install Node.js 18+ from https://nodejs.org/, then re-run this script."
      ;;
  esac
  command -v node >/dev/null 2>&1 && [ "$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)" -ge 18 ]
}

install_node_via_nvm() {
  if [ ! -s "${HOME}/.nvm/nvm.sh" ]; then
    echo "Installing nvm..."
    curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
  fi
  # shellcheck disable=SC1091
  . "${HOME}/.nvm/nvm.sh"
  nvm install --lts
  nvm use --lts
}

# --- pnpm -----------------------------------------------------------------

ensure_pnpm() {
  if command -v pnpm >/dev/null 2>&1; then return 0; fi
  echo "pnpm is not installed."
  if command -v corepack >/dev/null 2>&1; then
    if ask_yes_no "Enable pnpm now via corepack (bundled with Node)?"; then
      corepack enable
    fi
  fi
  if command -v pnpm >/dev/null 2>&1; then return 0; fi
  if ask_yes_no "corepack unavailable or declined. Install pnpm via its official installer now?"; then
    curl -fsSL https://get.pnpm.io/install.sh | sh -
    # The installer adds pnpm to a shell profile for future sessions; load
    # it into this one too.
    export PNPM_HOME="${HOME}/.local/share/pnpm"
    export PATH="${PNPM_HOME}:${PATH}"
  else
    echo "Install pnpm yourself (https://pnpm.io/installation), then re-run this script."
  fi
  command -v pnpm >/dev/null 2>&1
}

# --- Run checks, prompting to install rather than hard-failing ------------

echo "== Wavelength conference prototype: station setup =="
echo

ensure_git || fail "git is still not available. Install it manually and re-run this script."
ensure_node || fail "A working Node.js 18+ is still not available. Install it manually and re-run this script."
ensure_pnpm || fail "pnpm is still not available. Install it manually and re-run this script."

echo
echo "Preflight OK: git, node $(node -p 'process.versions.node'), pnpm $(pnpm --version)"
echo

# --- Install + fetch runtime -------------------------------------------

echo "Installing JS dependencies (pnpm install)..."
pnpm install || fail "pnpm install failed. See the error above."

echo
echo "Fetching pinned Wavelength WASM runtime assets..."
pnpm run fetch:runtime || fail "Fetching the Wavelength runtime failed. Check your network connection and re-run."

echo
echo "Setup complete."
echo

if [ "${START_SERVER}" = "1" ]; then
  echo "Starting local dev server (Ctrl+C to stop)..."
  echo "Once it's up, open the printed http://localhost:<port>/ URL in this"
  echo "station's browser -- NOT a LAN IP; see README.md for why"
  echo "cross-origin isolation requires localhost or https://."
  echo
  pnpm dev
else
  echo "Skipped starting the dev server (--no-start given)."
  echo "Run 'pnpm dev' in this directory when you're ready to open the app."
fi
