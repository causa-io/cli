import { WorkspaceContext } from '@causa/workspace';
import { CommanderError } from 'commander';
import { showHelpForCommand } from './command-help.js';
import { GlobalCliOptions, createBaseCommand } from './command.js';
import { CliContext } from './context/index.js';
import { createLogger } from './logger.js';

/**
 * Runs the CLI by initializing a {@link CliContext} in the provided working directory.
 * The {@link WorkspaceContext} will be used to load modules according to the configuration, which will register
 * available commands.
 *
 * @param args The arguments to pass to the CLI, without the node executable and the script name.
 * @param optionsOrContext Options for the CLI, or an initialized {@link WorkspaceContext} that will be used as base.
 * @returns The exit code of the CLI.
 */
export async function runCli(
  args: string[],
  optionsOrContext: GlobalCliOptions | WorkspaceContext = {},
): Promise<number> {
  const optionIsContext = optionsOrContext instanceof WorkspaceContext;
  const options = optionIsContext ? {} : optionsOrContext;
  let workspaceContext = optionIsContext ? optionsOrContext : undefined;

  const logger =
    workspaceContext?.logger ?? createLogger({ verbose: options.verbose });

  const program = createBaseCommand()
    .allowExcessArguments(false)
    .configureOutput({
      writeErr: (str) => logger.error(str),
      writeOut: (str) => logger.info(str),
    })
    .exitOverride();

  let isInitializationSuccessful = false;
  try {
    if (!workspaceContext) {
      workspaceContext = await WorkspaceContext.init({
        workingDirectory: options.workingDirectory,
        environment: options.environment,
        logger,
      });
    }

    const context = new CliContext(program, workspaceContext);
    isInitializationSuccessful = true;

    await context.program.parseAsync(args, { from: 'user' });
    return 0;
  } catch (error: any) {
    if (error instanceof CommanderError) {
      return error.exitCode;
    }

    const message = error.message ?? error;
    logger.error(`❌ ${message}`);

    if (!isInitializationSuccessful) {
      showHelpForCommand(program, logger);
    }

    return 1;
  }
}
