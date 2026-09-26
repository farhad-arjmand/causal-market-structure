# Contributing

Use Node.js 22 or later. Run `npm ci --ignore-scripts`, then `npm run check`.

Keep the public API typed and deterministic. Add synthetic regression tests for every behavior change. Never submit account data, credentials, proprietary datasets, or trading claims. Do not introduce network/filesystem side effects into imports. Explain timestamp semantics and numerical assumptions in pull requests.

Run `npm run test:package` before a pull request: the check installs the real tarball, runs the README example, verifies API behavior and compiles a TypeScript consumer. CI repeats both checks on Node.js 22 and 24. No publishing credentials are required for tests.

For a bug report, give the package version, runtime, a minimal synthetic reproduction, and expected versus actual behavior. Add a failing regression before the fix; explain numerical tolerances, availability clocks and null/unknown states. Update `docs/API.md` and `CHANGELOG.md` for semantic changes. Do not add keyword spam, unverified benchmark claims or claims that documentation guarantees AI indexing.
