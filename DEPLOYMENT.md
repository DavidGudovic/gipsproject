# GIPS PROJECT deployment

The website is static. Generated HTML, CSS, fonts and images are committed, so the server does not need Node or npm. GitHub Actions runs `npm ci`, `npm run build`, `npm run verify`, checks that generated files match the commit, and assembles a public-only `dist/` directory. Run `node scripts/publish.mjs` locally after building to preview that same public directory.

## Server layout

- Private checkout: `/home/david/gipsproject-deploy/repo`
- Installed deploy script: `/home/david/gipsproject-deploy/deploy.sh`
- Public releases: `/var/www/html/gipsproject-releases/<full-commit-sha>`
- Live nginx root: `/var/www/html/gipsproject.me`, a symlink to a release
- Preserved original checkout: `/home/david/gipsproject-deploy/legacy-before-redesign`

Keep the repository and deployment script outside nginx's document root. Release files and directories must be readable/traversable by nginx (0644/0755). A release inside `/home/david` would not work because nginx cannot traverse that private home directory.

## One-time setup

Run as `david`. The public repository needs no GitHub deployment token or SSH secret. Required server tools are Bash, Git, curl, Python 3, flock, tar, diff and coreutils.

```sh
mkdir -p /home/david/gipsproject-deploy /var/www/html/gipsproject-releases
git clone https://github.com/DavidGudovic/gipsproject.git /home/david/gipsproject-deploy/repo
install -m 755 /home/david/gipsproject-deploy/repo/scripts/deploy.sh /home/david/gipsproject-deploy/deploy.sh
```

After the release commit's **Verify** workflow has passed on a `push` to `main`, assemble the first release using a temporary live symlink. This checks CI before touching the existing site:

```sh
/home/david/gipsproject-deploy/deploy.sh \
  /home/david/gipsproject-deploy/repo \
  /var/www/html/gipsproject-releases \
  /var/www/html/gipsproject-bootstrap
```

Verify that the bootstrap symlink resolves to a complete public release. Check that `legacy-before-redesign` does not already exist. Preserve the complete original checkout outside the public tree, then move the ready symlink into place:

```sh
test ! -e /home/david/gipsproject-deploy/legacy-before-redesign
test -L /var/www/html/gipsproject-bootstrap
mv /var/www/html/gipsproject.me /home/david/gipsproject-deploy/legacy-before-redesign
mv -T /var/www/html/gipsproject-bootstrap /var/www/html/gipsproject.me
```

The directory-to-symlink migration has a short gap between its two moves. Subsequent releases replace the existing symlink atomically. Keep the old checkout as the recovery copy until the client accepts the release.

## Automatic publishing

Add this entry with `crontab -e`, preserving any existing entries:

```cron
*/5 * * * * /home/david/gipsproject-deploy/deploy.sh /home/david/gipsproject-deploy/repo /var/www/html/gipsproject-releases /var/www/html/gipsproject.me >> /home/david/gipsproject-deploy/deploy.log 2>&1
```

The script locks concurrent invocations, refuses a dirty private checkout, fetches `origin/main`, and asks GitHub's public Actions API for the latest **Verify** `push` run on that exact SHA. It deploys only if that run completed successfully for this repository and `main`. Failed, missing, pending or inaccessible checks leave production unchanged. API errors and rate limits also leave production unchanged; the next cron run retries. An unchanged live SHA avoids another API request.

Only `index.html`, `en/`, `assets/`, `robots.txt`, `sitemap.xml` and `llms.txt` enter a release. Hidden files, symlinks and unexpected file extensions are rejected. The server exports these files from the verified Git commit, never from the checkout's working files. Existing releases remain intact; the script neither resets nor cleans the repository. A release is staged and checked before the live symlink changes.

The private checkout intentionally stays on its installed version; only its remote-tracking ref advances. If deployment code changes, review the new script, update the clean private checkout with a fast-forward, and reinstall the script explicitly. This prevents the polling script from changing itself implicitly.

## nginx

`deploy/nginx-gipsproject.conf` is a proposed configuration using the server's existing certificate paths and ACME webroot. It redirects HTTP and www to the canonical HTTPS apex, redirects the legacy `/?lang=en` URL, blocks source paths, keeps real 404 responses, and uses seven-day caching for versioned assets while requiring HTML/crawl files to revalidate.

An administrator must back up the existing configuration, install the proposed file, run `nginx -t`, and reload nginx only if validation passes. Installing the repository does not install this configuration. Confirm the existing Certbot renewal method before changing its ACME location. The public-only release already removes `.git`, dependencies and source files from web access even before nginx hardening is applied.

## Rollback

For ordinary later changes, a `git revert` commit can pass Verify and publish normally. Reverting the initial redesign also removes the new build and CI infrastructure, so use the immediate rollback below first, keep polling paused, and then revert the redesign commit in Git. Do not expect that complete infrastructure removal to auto-deploy. The pre-redesign public release is retained at `/var/www/html/gipsproject-releases/05b4e3dd954f7938fa1be6cf4ab717626ddffc10`.

For an immediate rollback, pause polling before switching to a previous release. Hold the same lock as deployment, use an existing release path, and replace the symlink atomically:

```sh
touch /home/david/gipsproject-deploy/repo/.git/gipsproject-deploy-paused
(
  flock 9
  previous=/var/www/html/gipsproject-releases/REPLACE_WITH_PREVIOUS_FULL_SHA
  test -s "$previous/index.html" || exit 1
  next_link=$(mktemp -u /var/www/html/gipsproject.rollback-XXXXXX)
  ln -s "$previous" "$next_link" || exit 1
  mv -Tf "$next_link" /var/www/html/gipsproject.me
) 9>/home/david/gipsproject-deploy/repo/.git/gipsproject-deploy.lock
```

Keep polling paused until `main` points to the intended release, otherwise the next successful poll will deploy the latest `main` again. Resume with:

```sh
rm /home/david/gipsproject-deploy/repo/.git/gipsproject-deploy-paused
```

The initial legacy checkout can also be recovered from its private backup. Prefer assembling its public files into a separate release before switching back so Git metadata and dependencies remain private.

## Release verification

Check `/`, `/en/`, `/robots.txt`, `/sitemap.xml` and `/llms.txt`, plus desktop/mobile navigation, language switching, the gallery and contact links. Confirm `/.git/HEAD`, `/package.json`, `/node_modules/tailwindcss/package.json` and an unknown page return 404. After nginx changes, confirm www and HTTP redirect to `https://gipsproject.me`, `/?lang=en` redirects to `/en/`, and CSS/JS query versions refresh after code changes.
