# Maintainer release checklist

This repository is public source. It has no automatic npm publishing workflow.

Before a first npm release:

1. Confirm the package name/scope is available and the authenticated account has publish rights.
2. Review LICENSE, NOTICE, README and the public file allowlist; confirm no private material.
3. Run `npm ci --ignore-scripts` and `npm run check` on a clean checkout.
4. Require green CI on supported Node versions.
5. Run `npm pack`, inspect the tarball, install it into a clean temporary consumer, and verify the exported API.
6. Confirm version and changelog; do not overwrite an existing published version.
7. Obtain explicit release approval, then publish with public access using the maintainer's approved authentication/2FA flow. Never put credentials in source or chat.
8. Verify the registry artifact and metadata match the reviewed tarball. Tag the reviewed commit and document the release.

Do not publish merely because the source was pushed to GitHub.
