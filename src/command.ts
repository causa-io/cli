import { WorkspaceContext } from '@causa/workspace';
import { Command } from 'commander';
import { CliContext } from './context/index.js';
import { createLogger } from './logger.js';

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
function createBaseCommand(): Command {
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
 * @returns The parsed options.
 */
function parseGlobalOptions(): GlobalCliOptions {
  return createBaseCommand()
    .allowUnknownOption() // Command-specific options should be ignored.
    .helpOption(false) // The `--help` option shouldn't be caught.
    .exitOverride(() => {}) // The process should not be exited.
    .parse()
    .opts();
}

/**
 * Runs the CLI, by parsing global options and initializing a {@link CliContext} in the provided working directory.
 * The {@link WorkspaceContext} will be used to load modules according to the configuration, which will register
 * available commands.
 */
export async function runCli(): Promise<void> {
  const options = parseGlobalOptions();

  const logger = createLogger({ verbose: options.verbose });

  const program = createBaseCommand().allowExcessArguments(false);

  let context: CliContext;
  try {
    const workspaceContext = await WorkspaceContext.init({
      workingDirectory: options.workingDirectory,
      environment: options.environment,
      logger,
    });
    context = new CliContext(program, workspaceContext);
  } catch (error: any) {
    const message = error.message ?? error;
    logger.error(`❌ ${message}`);
    program.outputHelp();
    process.exitCode = 1;
    return;
  }

  await context.program.parseAsync();
}
