import { WorkspaceContext } from '@causa/workspace';
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
  const program = createBaseCommand().allowExcessArguments(false);

  const optionIsContext = optionsOrContext instanceof WorkspaceContext;
  const options = optionIsContext ? {} : optionsOrContext;
  let workspaceContext = optionIsContext ? optionsOrContext : undefined;

  const logger =
    workspaceContext?.logger ?? createLogger({ verbose: options.verbose });

  let context: CliContext;
  try {
    if (!workspaceContext) {
      workspaceContext = await WorkspaceContext.init({
        workingDirectory: options.workingDirectory,
        environment: options.environment,
        logger,
      });
    }

    context = new CliContext(program, workspaceContext);
  } catch (error: any) {
    const message = error.message ?? error;
    logger.error(`❌ ${message}`);
    program.outputHelp();
    return 1;
  }

  await context.program.parseAsync(args, { from: 'user' });
  return 0;
}
