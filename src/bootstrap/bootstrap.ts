import {
  isModuleLocalPath,
  loadWorkspaceConfiguration,
} from '@causa/workspace';
import { exec } from 'child_process';
import { mkdir, rm, stat, writeFile } from 'fs/promises';
import { join, resolve } from 'path';
import { Logger } from 'pino';
import { fileURLToPath } from 'url';
import { GlobalCliOptions, parseGlobalOptions } from '../command.js';
import { createLogger } from '../logger.js';
import { ModuleInstallationError } from './errors.js';
import { runCliInWorkerThread } from './worker.js';

/**
 * The folder placed at the root of Causa workspaces, containing the npm installation.
 */
const CAUSA_FOLDER = '.causa';

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
  const logger = createLogger();

  let cliOptions: GlobalCliOptions;
  let causaCliLocation: string | null;
  try {
    cliOptions = parseGlobalOptions(args);
    const workingDirectory = resolve(
      cliOptions.workingDirectory ?? process.cwd(),
    );

    causaCliLocation = await setUpCausaFolderIfNeeded(workingDirectory, logger);
  } catch (error: any) {
    const message = error.message ?? error;
    logger.error(`❌ ${message}`);
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
  await setUpCausaFolder(causaFolder, modules, logger);

  return causaCliLocation;
}

/**
 * Initializes the Causa folder at the given location, installing the npm modules in the process.
 *
 * @param causaFolder The location of the Causa folder to initialize.
 * @param modules The modules to install in the Causa folder.
 * @param logger The logger to use.
 */
async function setUpCausaFolder(
  causaFolder: string,
  modules: Record<string, string>,
  logger: Logger,
): Promise<void> {
  await mkdir(causaFolder, { recursive: true });

  await makePackageFile(causaFolder, modules);

  await installModules(causaFolder, logger);
}

/**
 * Creates the `package.json` file in the Causa folder, containing the given modules.
 * Modules that are local paths will be ignored. If not present, the `@causa/cli` module will be added.
 *
 * @param causaFolder The location of the Causa folder in which to create the package file.
 * @param modules The modules to include in the package file.
 */
async function makePackageFile(
  causaFolder: string,
  modules: Record<string, string>,
): Promise<void> {
  const dependencies = { ...modules };

  Object.keys(dependencies).forEach((moduleName) => {
    if (isModuleLocalPath(moduleName)) {
      delete dependencies[moduleName];
    }
  });

  if (dependencies['@causa/cli'] === undefined) {
    dependencies['@causa/cli'] = '*';
  }

  const packagePath = join(causaFolder, 'package.json');
  await writeFile(packagePath, JSON.stringify({ dependencies }));
}

/**
 * Installs the npm modules in the Causa folder, after removing the existing `node_modules` folder.
 *
 * @param causaFolder The location of the Causa folder in which to install the modules.
 * @param logger The logger to use.
 */
async function installModules(
  causaFolder: string,
  logger: Logger,
): Promise<void> {
  const nodeModulesFolder = join(causaFolder, 'node_modules');

  logger.debug(
    `🔥 Removing existing node modules folder '${nodeModulesFolder}'.`,
  );
  await rm(nodeModulesFolder, { recursive: true, force: true });
  await rm(join(causaFolder, 'package-lock.json'), { force: true });

  logger.debug(`➕ Installing node modules in '${causaFolder}'.`);

  await new Promise<void>((resolve, reject) => {
    const child = exec('npm install --quiet', {
      cwd: causaFolder,
    });
    child.stderr?.pipe(process.stderr);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new ModuleInstallationError());
      }
    });
  });
}
