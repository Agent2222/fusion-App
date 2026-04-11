#!/usr/bin/env bash
# Opens this repo in Finder, ensures YYYY-MM on SCOGE SSD, then copies the project there.
# If fusion-app already exists in that month folder, uses fusion-app-2, fusion-app-3, …
# When rsync is blocked by macOS (Terminal → removable volumes), falls back to Finder duplicate.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SSD="/Volumes/SCOGE SSD"
FUSION_DIR="${SSD}/Web Backups/FUSION"
MONTH_NAME="$(date +%Y-%m)"
MONTH_DIR="${FUSION_DIR}/${MONTH_NAME}"
PROJECT_BASE="$(basename "$ROOT")"

open "$ROOT"

if [[ ! -d "$SSD" ]]; then
  echo "SCOGE SSD is not mounted; skipping backup." >&2
  open "${FUSION_DIR}" 2>/dev/null || true
  exit 0
fi

ensure_month_dir() {
  if mkdir -p "$MONTH_DIR" 2>/dev/null; then
    return 0
  fi
  osascript <<ASCRIPT
tell application "Finder"
    try
        set v to disk "SCOGE SSD"
        set f to folder "Web Backups:FUSION" of v
        if not (exists folder "${MONTH_NAME}" of f) then
            make new folder at f with properties {name:"${MONTH_NAME}"}
        end if
    on error errMsg
        error errMsg
    end try
end tell
ASCRIPT
}

if ! ensure_month_dir; then
  echo "" >&2
  echo "Could not create or access: $MONTH_DIR" >&2
  echo "  • Grant Terminal/Cursor access to removable volumes (Privacy settings)." >&2
  echo "" >&2
  open "${FUSION_DIR}" 2>/dev/null || open "$SSD" || true
  exit 0
fi

if [[ ! -d "$MONTH_DIR" ]]; then
  echo "Month folder missing after create: $MONTH_DIR" >&2
  exit 0
fi

# First free name: fusion-app | fusion-app-2 | fusion-app-3 | …
pick_backup_destination() {
  local dest="${MONTH_DIR}/${PROJECT_BASE}"
  if [[ ! -e "$dest" ]]; then
    echo "$dest"
    return
  fi
  local n=2
  while [[ -e "${MONTH_DIR}/${PROJECT_BASE}-${n}" ]]; do
    n=$((n+1))
  done
  echo "${MONTH_DIR}/${PROJECT_BASE}-${n}"
}

DEST="$(pick_backup_destination)"
TARGET_BASENAME="$(basename "$DEST")"

echo "Backing up to: $DEST" >&2

RSYNC_EXCLUDES=(
  --exclude node_modules
  --exclude dist
  --exclude dist_check
  --exclude dist_live
  --exclude .dfx-cache
  --exclude .dfx
  --exclude declarations
  --exclude target
  --exclude .env
  --exclude .DS_Store
  --exclude '**/.DS_Store'
)

# Finder duplicate: works when bash/rsync cannot write to the volume (Cursor + removable TCC)
copy_via_finder() {
  echo "rsync blocked by macOS; using Finder to copy (full folder including node_modules — may take a while)…" >&2
  osascript <<ASCRIPT
tell application "Finder"
    try
        activate
        set srcAlias to POSIX file "$ROOT" as alias
        set monthF to folder "${MONTH_NAME}" of folder "FUSION" of folder "Web Backups" of disk "SCOGE SSD"
        set dupItem to duplicate srcAlias to monthF
        set name of dupItem to "${TARGET_BASENAME}"
    on error errMsg number errNum
        error errMsg number errNum
    end try
end tell
ASCRIPT
}

if rsync -a "${RSYNC_EXCLUDES[@]}" "$ROOT/" "$DEST/"; then
  echo "Backup complete (rsync)." >&2
  open "$DEST"
  exit 0
fi

echo "rsync could not write to the disk (common with Cursor + external volumes)." >&2

if copy_via_finder; then
  echo "Backup complete (Finder)." >&2
  open "$DEST"
  exit 0
fi

echo "" >&2
echo "Copy failed. Tried: rsync, then Finder duplicate." >&2
echo "  • System Settings → Privacy & Security → Files and Folders: enable Removable Volumes for Cursor." >&2
echo "  • Or run:  open -a Finder \"$MONTH_DIR\"  and drag the project folder in by hand." >&2
echo "" >&2
open "$MONTH_DIR" 2>/dev/null || true
exit 1
