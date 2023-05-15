# 🔖 Changelog

## Unreleased

## v0.2.1 (2023-05-15)

Fixes:

- Make dependency on the `workspace` package looser, to avoid incompatibilities before version 1 is reached.

## v0.2.0 (2023-05-05)

Fixes:

- Fix typo in package `causa` executable.

Breaking changes:

- Upgrade to `@causa/workspace` `0.2.0`.

## v0.1.0 (2023-05-04)

Features:

- Introduce `Cli*` decorators for `WorkspaceFunction`s.
- Implement the `CliContext`.
- Implement the `runCli` command entrypoint (`causa` executable).
