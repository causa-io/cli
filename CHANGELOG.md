# 🔖 Changelog

## Unreleased

Features:

- Reinstall modules from the configuration when an incompatible version or missing module is detected in the Causa folder.

## v0.3.3 (2023-05-22)

Fixes:

- Ensure help for subcommands is displayed instead of the root `cs` command.

## v0.3.2 (2023-05-22)

Fixes:

- Ensure help is displayed when requested using `help` or `--help`.

## v0.3.1 (2023-05-22)

Features:

- Show the command's help when running `cs` outside of a Causa workspace.

Fixes:

- Ensure `cs` in executed using `node`.
- Properly log Commander errors.

## v0.3.0 (2023-05-22)

Breaking changes:

- Replace the `causa` Node executable with `cs`, which exposes the bootstrap mechanism (see features).

Features:

- Refactor and expose `runCli` such that it can be used it tests. It no longer manipulates the process's exit code and accepts user-provided arguments instead of getting them from `process.argv`.
- Implement the bootstrap logic, looking for the workspace in which the CLI should be run, and initializing it (with its dependencies) if necessary.

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
