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

# Finder copy: works when bash/rsync cannot write to the volume (Cursor + removable TCC).
# We create an empty folder named TARGET_BASENAME first, then duplicate *contents* of the source tree.
# Duplicating the whole project folder into the month dir would create another "fusion-app" next to an
# existing backup "fusion-app" and Finder errors with -15267 (same name).
copy_via_finder() {
  echo "rsync blocked by macOS; using Finder to copy (full folder including node_modules — may take a while)…" >&2
  osascript - "$ROOT" "$TARGET_BASENAME" "$MONTH_NAME" <<'ASCRIPT'
on run argv
  set rootPath to item 1 of argv
  set targetBasename to item 2 of argv
  set monthName to item 3 of argv
  tell application "Finder"
    try
      activate
      set monthF to folder monthName of folder "FUSION" of folder "Web Backups" of disk "SCOGE SSD"
      set srcAlias to POSIX file rootPath as alias
      set srcF to folder srcAlias
      set destFolder to make new folder at monthF with properties {name: targetBasename}
      duplicate every item of srcF to destFolder
    on error errMsg number errNum
      error errMsg number errNum
    end try
  end tell
end run
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
