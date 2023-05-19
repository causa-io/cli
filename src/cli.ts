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
 * @param options Options for the CLI.
 * @returns The exit code of the CLI.
 */
export async function runCli(
  args: string[],
  options: GlobalCliOptions = {},
): Promise<number> {
  const program = createBaseCommand().allowExcessArguments(false);
  const logger = createLogger({ verbose: options.verbose });

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
    return 1;
  }

  await context.program.parseAsync(args, { from: 'user' });
  return 0;
}
