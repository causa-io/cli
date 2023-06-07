import {
  ModuleLoadingError,
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
import { RunCliOptions } from '../cli.js';
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
 * The result of {@link setUpCausaFolderIfNeeded}, which contains the detected workspace and Causa folder location.
 */
type CausaFolderSetupResult = {
  /**
   * The location of the workspace root.
   */
  rootPath: string;

  /**
   * The location of the Causa CLI script.
   */
  causaCliLocation: string;

  /**
   * The modules to install in the Causa folder, loaded from the configuration.
   */
  modules: Record<string, string>;

  /**
   * Whether the current process is running from the detected workspace installation.
   */
  isRunningFromWorkspace: boolean;

  /**
   * Whether the Causa folder was initialized and modules were installed during the setup.
   */
  didSetUp: boolean;
};

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
  let setupResult: CausaFolderSetupResult;
  let logger: Logger | undefined;
  try {
    cliOptions = parseGlobalOptions(args);
    const workingDirectory = resolve(
      cliOptions.workingDirectory ?? process.cwd(),
    );

    logger = createLogger({ verbose: cliOptions.verbose });

    setupResult = await setUpCausaFolderIfNeeded(workingDirectory, logger);
  } catch (error: any) {
    logger = logger ?? createLogger();

    const message = error.message ?? error;
    logger.error(`❌ ${message}`);

    if (error instanceof WorkspaceContextError) {
      // This can be due to the CLI being run outside of a Causa workspace, in which case the user might need help.
      showHelpForCommand(createBaseCommand(), logger);
    }

    return 1;
  }

  return await runCliFromSetupResult(args, setupResult, cliOptions, logger);
}

/**
 * Runs the CLI, using the given setup result to determine how to run it.
 * If the current process is running from the workspace installation, it will run the CLI directly. Otherwise, it is run
 * as a worker thread. Also, if modules have not been installed during the setup, module version errors will be caught
 * and will trigger the setup again, forcing the modules to be installed.
 *
 * @param args The arguments to pass to the CLI, without the node executable and the script name.
 * @param setupResult The result of the setup operation, used to determine whether to run the CLI directly or as a
 *   worker thread.
 * @param globalCliOptions The options to pass to the CLI.
 * @param logger The logger to use.
 * @returns The exit code of the CLI.
 */
async function runCliFromSetupResult(
  args: string[],
  setupResult: CausaFolderSetupResult,
  globalCliOptions: GlobalCliOptions,
  logger: Logger,
): Promise<number> {
  const runCliOptions: RunCliOptions = {
    ...globalCliOptions,
    rethrowModuleLoadingError: !setupResult.didSetUp,
  };

  try {
    if (setupResult.isRunningFromWorkspace) {
      const { runCli } = await import('../cli.js');
      return await runCli(args, runCliOptions);
    }

    return await runCliInWorkerThread(
      setupResult.causaCliLocation,
      args,
      runCliOptions,
    );
  } catch (error: any) {
    // Not checking the actual type of the error, as it might come from a different version of the workspace module.
    if (
      !(error as ModuleLoadingError).requiresModuleInstall ||
      !runCliOptions.rethrowModuleLoadingError
    ) {
      throw error;
    }

    logger.warn(
      '📦 Module version changes detected in the configuration, reinstalling modules in the Causa folder.',
    );

    await setUpCausaFolderWithCli(
      setupResult.rootPath,
      setupResult.modules,
      logger,
    );

    return await runCliInWorkerThread(
      setupResult.causaCliLocation,
      args,
      globalCliOptions,
    );
  }
}

/**
 * Looks for the Causa workspace starting from the given working directory, and initializes the Causa folder within it
 * if necessary.
 *
 * @param workingDirectory The working directory from which to look for the workspace.
 * @param logger The logger to use.
 * @returns A {@link CausaFolderSetupResult} object.
 */
async function setUpCausaFolderIfNeeded(
  workingDirectory: string,
  logger: Logger,
): Promise<CausaFolderSetupResult> {
  logger.debug(
    `📂 Looking for workspace to bootstrap starting from '${workingDirectory}'.`,
  );

  const { configuration, rootPath } = await loadWorkspaceConfiguration(
    workingDirectory,
    null,
    logger,
  );

  const causaFolder = join(rootPath, CAUSA_FOLDER);
  const causaCliLocation = join(causaFolder, CAUSA_CLI_LOCATION);
  const modules = configuration.get('causa.modules') ?? {};
  const partialResult = { causaCliLocation, rootPath, modules };

  const sourceFilePath = fileURLToPath(import.meta.url);
  if (sourceFilePath.startsWith(causaFolder)) {
    logger.debug(
      `📂 Already running from the workspace installation in '${causaFolder}'.`,
    );
    return { ...partialResult, isRunningFromWorkspace: true, didSetUp: false };
  }

  try {
    await stat(causaCliLocation);

    logger.debug(
      `📂 Found existing workspace installation in '${causaFolder}'.`,
    );
    return { ...partialResult, isRunningFromWorkspace: false, didSetUp: false };
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  logger.info(
    `🎉 Could not find a workspace installation with CLI in '${causaFolder}', creating it.`,
  );
  await setUpCausaFolderWithCli(rootPath, modules, logger);

  return { ...partialResult, isRunningFromWorkspace: false, didSetUp: true };
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
