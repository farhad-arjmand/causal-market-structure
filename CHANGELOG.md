# Changelog

## 0.1.1

### Fixed

- Reject malformed JavaScript `asOf` cutoffs instead of silently processing future-available bars.
- Regression tests reproduce the prior failure before checking the corrected behavior.

### Documentation and packaging

- Add a detailed API reference and optional machine-readable documentation map, bundled in the npm package.
- Improve searchable description/keywords, use cases, package links, CI/version badges and contribution templates.
- Verify README examples, functional behavior and public TypeScript imports in an isolated tarball consumer.

## 0.1.0

Initial public, experimental release. Typed pure-function API, synthetic regression tests, examples, and an npm package allowlist. ESM JavaScript and TypeScript declarations with no runtime dependencies.
