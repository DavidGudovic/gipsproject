#!/usr/bin/env bash
set -Eeuo pipefail
umask 022

# Usage: deploy.sh PRIVATE_REPO RELEASES_DIR LIVE_SYMLINK
if [[ $# != 3 ]]; then
  echo "Usage: $0 PRIVATE_REPO RELEASES_DIR LIVE_SYMLINK" >&2
  exit 2
fi
for command in git curl python3 flock tar realpath mktemp diff; do
  command -v "$command" >/dev/null || { echo "Missing command: $command" >&2; exit 1; }
done
[[ $1 = /* && $2 = /* && $3 = /* ]] || { echo "All paths must be absolute." >&2; exit 2; }
repo=$(realpath -e -- "$1")
releases=$(realpath -e -- "$2")
live=$(realpath -e -- "$(dirname -- "$3")")/$(basename -- "$3")
[[ -d "$repo/.git" && -d "$releases" && -w "$releases" ]] || { echo "Private checkout and writable releases directory must exist." >&2; exit 1; }
[[ "$releases" != "$repo" && "$releases" != "$live" && "$live" != "$repo" ]] || { echo "Deployment paths must be separate." >&2; exit 2; }
[[ ! -e "$live" || -L "$live" ]] || { echo "Live path is a real directory/file. Complete the one-time migration first." >&2; exit 1; }

exec 9>"$repo/.git/gipsproject-deploy.lock"
flock -n 9 || exit 0
[[ ! -e "$repo/.git/gipsproject-deploy-paused" ]] || { echo "Deployment paused for rollback or maintenance."; exit 0; }
[[ -z $(git -C "$repo" status --porcelain) ]] || { echo "Private checkout has changes; refusing to deploy." >&2; exit 1; }
origin=$(git -C "$repo" remote get-url origin)
case "$origin" in
  https://github.com/DavidGudovic/gipsproject.git|git@github.com:DavidGudovic/gipsproject.git) ;;
  *) echo "Unexpected repository origin." >&2; exit 1 ;;
esac
export GIT_TERMINAL_PROMPT=0
export GIT_SSH_COMMAND='ssh -o BatchMode=yes -o ConnectTimeout=15'
git -C "$repo" fetch --quiet --no-tags origin refs/heads/main:refs/remotes/origin/main
sha=$(git -C "$repo" rev-parse --verify 'refs/remotes/origin/main^{commit}')
[[ $sha =~ ^[0-9a-f]{40}$ ]] || { echo "Invalid release SHA." >&2; exit 1; }
release="$releases/$sha"
[[ $(readlink -- "$live" || true) != "$release" ]] || exit 0

staging=
next=
response=$(mktemp)
cleanup() {
  rm -f -- "$response"
  [[ -z "$staging" ]] || rm -rf -- "$staging"
  [[ -z "$next" ]] || rm -f -- "$next"
}
trap cleanup EXIT
curl --fail --silent --show-error --connect-timeout 10 --max-time 30 \
  -H 'Accept: application/vnd.github+json' -H 'X-GitHub-Api-Version: 2022-11-28' \
  "https://api.github.com/repos/DavidGudovic/gipsproject/actions/workflows/verify.yml/runs?branch=main&event=push&head_sha=$sha&per_page=100" >"$response"
python3 - "$response" "$sha" <<'PY'
import json, sys
with open(sys.argv[1]) as handle:
    payload = json.load(handle)
runs = [run for run in payload['workflow_runs'] if
        run.get('head_sha') == sys.argv[2] and run.get('event') == 'push' and
        run.get('head_branch') == 'main' and run.get('path') == '.github/workflows/verify.yml' and
        run.get('head_repository', {}).get('full_name') == 'DavidGudovic/gipsproject']
latest = max(runs, key=lambda run: run['id'], default={})
if latest.get('status') != 'completed' or latest.get('conclusion') != 'success':
    sys.exit('Release held: the latest Verify push run for this exact main SHA has not succeeded.')
print('Verified CI:', latest['html_url'])
PY

public_paths=(index.html en assets robots.txt sitemap.xml llms.txt)
# Validate tree entries before extracting; neither links nor hidden files belong in a release.
python3 - "$repo" "$sha" "${public_paths[@]}" <<'PY'
import pathlib, subprocess, sys
entries = subprocess.check_output(['git', '-C', sys.argv[1], 'ls-tree', '-rz', sys.argv[2], '--', *sys.argv[3:]])
allowed = {'.html', '.css', '.js', '.woff', '.woff2', '.ttf', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.avif', '.ico', '.txt', '.xml'}
for entry in entries.split(b'\0'):
    if not entry:
        continue
    meta, name = entry.split(b'\t', 1)
    path = pathlib.PurePosixPath(name.decode('utf-8'))
    if meta.split()[0] not in (b'100644', b'100755') or any(part.startswith('.') for part in path.parts) or path.suffix.lower() not in allowed:
        sys.exit('Refusing non-public tree entry: ' + str(path))
PY
staging=$(mktemp -d "$releases/.staging-$sha-XXXXXX")
git -C "$repo" archive "$sha" -- "${public_paths[@]}" | tar -x -C "$staging"
for required in index.html en/index.html assets/css/main.css robots.txt sitemap.xml llms.txt; do
  [[ -s "$staging/$required" ]] || { echo "Missing public file: $required" >&2; exit 1; }
done
chmod -R u=rwX,go=rX "$staging"
if [[ -e "$release" || -L "$release" ]]; then
  [[ -d "$release" && ! -L "$release" ]] || { echo "Existing release path is invalid." >&2; exit 1; }
  diff -qr "$staging" "$release" >/dev/null || { echo "Existing release differs; inspect it before retrying." >&2; exit 1; }
else
  mv -- "$staging" "$release"
  staging=
fi
next_path="$live.next-$$"
ln -s -- "$release" "$next_path"
next="$next_path"
mv -Tf -- "$next" "$live"
next=
printf 'Published %s at %s\n' "$sha" "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
