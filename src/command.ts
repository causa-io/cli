import { Command } from 'commander';

/**
 * The name of the base command.
 */
const COMMAND_NAME = 'cs';

/**
 * CLI options that can be specified no matter the command.
 */
export type GlobalCliOptions = {
  /**
   * The working directory for the command.
   * Defaults to the current directory.
   */
  workingDirectory?: string;

  /**
   * Whether debug logs should be displayed.
   * Defaults to `false`.
   */
  verbose?: boolean;

  /**
   * The environment to select before running the command.
   * This may change the configuration to include environment-specific settings.
   */
  environment?: string;
};

/**
 * Creates the base command with global options.
 *
 * @returns The `commander` {@link Command}.
 */
export function createBaseCommand(): Command {
  return new Command()
    .name(COMMAND_NAME)
    .option(
      '-w, --workingDirectory <workingDirectory>',
      'Sets the working directory for the command.',
    )
    .option('-v, --verbose', 'Enables debug logs.')
    .option(
      '-e, --environment <environment>',
      'Sets the environment for the command.',
    );
}

/**
 * Parses the global CLI options by running a dummy `commander` command, only configured with global options.
 *
 * @param args The arguments to parse.
 * @returns The parsed options.
 */
export function parseGlobalOptions(args: string[]): GlobalCliOptions {
  return createBaseCommand()
    .allowUnknownOption() // Command-specific options should be ignored.
    .helpOption(false) // The `--help` option shouldn't be caught.
    .exitOverride() // The process should not be exited.
    .configureOutput({ writeOut: () => {}, writeErr: () => {} }) // No output should be written.
    .parse(args, { from: 'user' })
    .opts();
}
