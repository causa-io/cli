import {
  WorkspaceContextError,
  loadWorkspaceConfiguration,
} from '@causa/workspace';
import {
  CAUSA_FOLDER,
  setUpCausaFolder,
} from '@causa/workspace/initialization';
import { stat } from 'fs/promises';
import { join, resolve } from 'path';
import { Logger } from 'pino';
import { fileURLToPath } from 'url';
import { showHelpForCommand } from '../command-help.js';
import {
  GlobalCliOptions,
  createBaseCommand,
  parseGlobalOptions,
} from '../command.js';
import { createLogger } from '../logger.js';
import { runCliInWorkerThread } from './worker.js';

/**
 * The expected location of the CLI script (which can be called as a worker thread), relative to the Causa folder.
 */
const CAUSA_CLI_LOCATION = 'node_modules/@causa/cli/dist/bootstrap/cli.js';

/**
 * The entrypoint of the CLI.
 * It will first look for the Causa workspace and the corresponding installation folder, initializing it if needed.
 * If the current process is running from the workspace installation, it will run the CLI directly. Otherwise, it is run
 * as a worker thread.
 *
 * @param args The arguments to pass to the CLI, without the node executable and the script name.
 * @returns The exit code of the CLI.
 */
export async function bootstrapCli(args: string[]): Promise<number> {
  let cliOptions: GlobalCliOptions;
  let causaCliLocation: string | null;
  let logger: Logger | undefined;
  try {
    cliOptions = parseGlobalOptions(args);
    const workingDirectory = resolve(
      cliOptions.workingDirectory ?? process.cwd(),
    );

    logger = createLogger({ verbose: cliOptions.verbose });

    causaCliLocation = await setUpCausaFolderIfNeeded(workingDirectory, logger);
  } catch (error: any) {
    const errorLogger = logger ?? createLogger();

    const message = error.message ?? error;
    errorLogger.error(`❌ ${message}`);

    if (error instanceof WorkspaceContextError) {
      // This can be due to the CLI being run outside of a Causa workspace, in which case the user might need help.
      showHelpForCommand(createBaseCommand(), errorLogger);
    }

    return 1;
  }

  if (causaCliLocation === null) {
    const { runCli } = await import('../cli.js');
    return await runCli(args, cliOptions);
  }

  return await runCliInWorkerThread(causaCliLocation, args, cliOptions);
}

/**
 * Looks for the Causa workspace starting from the given working directory, and initializes the Causa folder within it
 * if necessary.
 *
 * @param workingDirectory The working directory from which to look for the workspace.
 * @param logger The logger to use.
 * @returns The location of the CLI script, or `null` if the current process is running from the workspace installation.
 */
async function setUpCausaFolderIfNeeded(
  workingDirectory: string,
  logger: Logger,
): Promise<string | null> {
  logger.debug(
    `📂 Looking for workspace to bootstrap starting from '${workingDirectory}'.`,
  );

  const { configuration, rootPath } = await loadWorkspaceConfiguration(
    workingDirectory,
    null,
    logger,
  );

  const causaFolder = join(rootPath, CAUSA_FOLDER);

  const sourceFilePath = fileURLToPath(import.meta.url);
  if (sourceFilePath.startsWith(causaFolder)) {
    logger.debug(
      `📂 Already running from the workspace installation in '${causaFolder}'.`,
    );
    return null;
  }

  const causaCliLocation = join(causaFolder, CAUSA_CLI_LOCATION);

  try {
    await stat(causaCliLocation);

    logger.debug(
      `📂 Found existing workspace installation in '${causaFolder}'.`,
    );
    return causaCliLocation;
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  logger.info(
    `🎉 Could not find a workspace installation with CLI in '${causaFolder}', creating it.`,
  );
  const modules = configuration.get('causa.modules') ?? {};
  await setUpCausaFolderWithCli(rootPath, modules, logger);

  return causaCliLocation;
}

/**
 * Initializes the Causa folder at the given location, installing the npm modules in the process.
 * If not specified, the Causa CLI package will be added to the modules to install.
 *
 * @param rootPath The path to the workspace root.
 * @param modules The modules to install in the Causa folder.
 * @param logger The logger to use.
 */
async function setUpCausaFolderWithCli(
  rootPath: string,
  modules: Record<string, string>,
  logger: Logger,
): Promise<void> {
  modules = { ...modules };
  if (modules['@causa/cli'] === undefined) {
    modules['@causa/cli'] = '*';
  }

  await setUpCausaFolder(rootPath, modules, logger);
}
