#!/usr/bin/env bash
set -euo pipefail

# ── install.sh ──────────────────────────────────────────────────────────────
# Builds the omap binary and installs it globally so it can be invoked from
# any directory as `omap`.
#
# Usage:
#   ./scripts/install.sh                 # install to ~/.local/bin (copy)
#   ./scripts/install.sh --link          # symlink dist/omap into ~/.local/bin
#   ./scripts/install.sh /usr/local      # install to /usr/local/bin
#   PREFIX=~/bin ./scripts/install.sh    # install to a custom prefix
#
# --link: symlinks instead of copying. Rebuilding (`bun run build`) will
#         automatically update the global install. Best for development.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$(dirname "$SCRIPT_DIR")"
REPO_ROOT="$(dirname "$PACKAGE_DIR")"

DIST_BIN="$PACKAGE_DIR/dist/omap"

# Parse --link flag and prefix
LINK=0
PREFIX=""
for arg in "${1:-}" "${2:-}"; do
	case "$arg" in
		--link) LINK=1 ;;
		-*) ;; # ignore unknown flags
		"") ;;
		*) PREFIX="$arg" ;;
	esac
done
PREFIX="${PREFIX:-$HOME/.local}"
BIN_DIR="$PREFIX/bin"
TARGET="$BIN_DIR/omap"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

say()  { printf "%b\n" "$*"; }
ok()   { printf "${GREEN}✓${NC} %s\n" "$*"; }
warn() { printf "${YELLOW}⚠${NC} %s\n" "$*"; }
die()  { printf "${RED}✗${NC} %s\n" "$*" >&2; exit 1; }

# ── Prerequisites ───────────────────────────────────────────────────────────

say ""
say "omap install — $(date '+%Y-%m-%d %H:%M:%S')"
say ""

if ! command -v bun &>/dev/null; then
	die "bun not found on PATH. Install it first: https://bun.sh"
fi

BUN_VERSION="$(bun --version)"
MIN_BUN="1.3.14"
if ! printf '%s\n%s' "$MIN_BUN" "$BUN_VERSION" | sort -V -c 2>/dev/null; then
	die "bun $MIN_BUN+ required (found $BUN_VERSION). Upgrade: bun upgrade"
fi
ok "bun $BUN_VERSION"

# ── Build ───────────────────────────────────────────────────────────────────

say "Building binary..."

cd "$PACKAGE_DIR"

if [ ! -d "node_modules" ]; then
	say "  Installing dependencies..."
	bun install --frozen-lockfile || die "bun install failed"
fi

bun run build || die "Build failed"

if [ ! -f "$DIST_BIN" ]; then
	die "Build succeeded but $DIST_BIN not found"
fi

ok "Binary built: $DIST_BIN ($(du -h "$DIST_BIN" | cut -f1))"

# ── Install ─────────────────────────────────────────────────────────────────

mkdir -p "$BIN_DIR"

if [ -f "$TARGET" ] || [ -L "$TARGET" ]; then
	say "Replacing existing $TARGET..."
	rm -f "$TARGET"
fi

if [ "$LINK" -eq 1 ]; then
	ln -s "$DIST_BIN" "$TARGET"
	ok "Symlinked $TARGET → $DIST_BIN"
	say "  Rebuild with 'bun run build' to update the global install."
else
	cp "$DIST_BIN" "$TARGET"
	chmod +x "$TARGET"
	ok "Installed to $TARGET"
fi

# ── PATH check ──────────────────────────────────────────────────────────────

IN_PATH=0
SAVED_IFS="$IFS"; IFS=":"
for dir in $PATH; do
	if [ "$dir" = "$BIN_DIR" ]; then
		IN_PATH=1
		break
	fi
done
IFS="$SAVED_IFS"

if [ "$IN_PATH" -eq 0 ]; then
	warn "$BIN_DIR is not on your PATH"
	say ""
	say "  Add this to your shell config (~/.bashrc, ~/.zshrc, etc.):"
	say "    export PATH=\"$BIN_DIR:\$PATH\""
	say ""
	say "  Or run this now for the current session:"
	say "    export PATH=\"$BIN_DIR:\$PATH\""
	say ""
fi

# ── Verify ──────────────────────────────────────────────────────────────────

if command -v omap &>/dev/null || "$TARGET" version &>/dev/null; then
	VER="$("$TARGET" version 2>/dev/null || echo "unknown")"
	ok "omap is ready ($VER)"
else
	warn "Could not verify omap installation (may need PATH update)"
fi

say ""
say "Run 'omap' to start. Run 'omap --help' for usage."
