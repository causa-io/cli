import { ModuleLoadingError, WorkspaceContext } from '@causa/workspace';
import { jest } from '@jest/globals';
import { mkdtemp, rm } from 'fs/promises';
import 'jest-extended';
import { tmpdir } from 'os';
import { join } from 'path';
import { pino } from 'pino';
import { fileURLToPath } from 'url';
import { runCli } from './cli.js';
import { outputObject } from './cli.module.test.js';
import { writeConfiguration } from './utils.test.js';

describe('command', () => {
  describe('runCli', () => {
    let tmpDir: string;
    let initialCwd: string;

    beforeEach(async () => {
      initialCwd = process.cwd();
      outputObject.workspace = undefined;
      outputObject.functionArg = undefined;

      tmpDir = await mkdtemp(join(tmpdir(), 'causa-tests-'));
      await writeConfiguration(tmpDir, 'causa.yaml', {
        workspace: { name: 'my-workspace' },
        environments: { dev: { name: '🪛' } },
        causa: {
          modules: {
            // Sneaky trick to import a local file as a module (which is not a valid package).
            // The version should be a local path such that it is not checked.
            [fileURLToPath(new URL('./cli.module.test.ts', import.meta.url))]:
              'file:/some/path',
          },
        },
      });
    });

    afterEach(async () => {
      await rm(tmpDir, { recursive: true, force: true });
    });

    it('should return an error when the directory is not a workspace', async () => {
      const actualExitCode = await runCli([]);

      expect(actualExitCode).toEqual(1);
    });

    it('should default to the current working directory', async () => {
      process.chdir(tmpDir);

      const actualExitCode = await runCli(['myFunction']);

      expect(actualExitCode).toEqual(0);
      // Using `cwd()` instead of `tmpDir` because it might be a link, which is resolved by `cwd()`.
      expect(outputObject.workspace?.rootPath).toEqual(process.cwd());
      expect(outputObject.workspace?.projectPath).toBeNull();
      expect(outputObject.workspace?.environment).toBeNull();
      process.chdir(initialCwd);
    });

    it('should select the correct environment', async () => {
      const actualExitCode = await runCli(['myFunction'], {
        workingDirectory: tmpDir,
        environment: 'dev',
      });

      expect(actualExitCode).toEqual(0);
      expect(outputObject.workspace?.rootPath).toEqual(tmpDir);
      expect(outputObject.workspace?.projectPath).toBeNull();
      expect(outputObject.workspace?.environment).toEqual('dev');
    });

    it('should select the correct working directory', async () => {
      const actualExitCode = await runCli(['myFunction'], {
        workingDirectory: tmpDir,
      });

      expect(actualExitCode).toEqual(0);
      expect(outputObject.workspace?.rootPath).toEqual(tmpDir);
      expect(outputObject.workspace?.projectPath).toBeNull();
      expect(outputObject.workspace?.environment).toBeNull();
    });

    it('should pass arguments to the function', async () => {
      const actualExitCode = await runCli(['myFunction', '🎉'], {
        workingDirectory: tmpDir,
      });

      expect(actualExitCode).toEqual(0);
      expect(outputObject.functionArg).toEqual('🎉');
    });

    it('should accept a WorkspaceContext in place of options', async () => {
      const logger = pino();
      const context = await WorkspaceContext.init({
        workingDirectory: tmpDir,
        logger,
      });
      jest.spyOn(logger, 'info');

      const actualExitCode = await runCli(['myFunction', '💉'], context);

      expect(actualExitCode).toEqual(0);
      expect(outputObject.functionArg).toEqual('💉');
      expect(outputObject.workspace).toEqual(context);
      expect(logger.info).toHaveBeenCalledExactlyOnceWith('👋');
    });

    it('should log a message and return 1 when an Commander error occurs', async () => {
      const logger = pino();
      const context = await WorkspaceContext.init({
        workingDirectory: tmpDir,
        logger,
      });
      jest.spyOn(logger, 'error');

      const actualExitCode = await runCli(
        ['myFunction', 'too', 'many'],
        context,
      );

      expect(actualExitCode).toEqual(1);
      expect(logger.error).toHaveBeenCalledExactlyOnceWith(
        expect.stringContaining('too many arguments'),
      );
    });

    it('should not log an error when using the help command', async () => {
      const logger = pino();
      const context = await WorkspaceContext.init({
        workingDirectory: tmpDir,
        logger,
      });
      jest.spyOn(logger, 'error');
      jest.spyOn(logger, 'info');

      const actualExitCode = await runCli(['help'], context);

      expect(actualExitCode).toEqual(0);
      expect(logger.error).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Usage:'),
      );
    });

    it('should not log an error when using the --help option', async () => {
      const logger = pino();
      const context = await WorkspaceContext.init({
        workingDirectory: tmpDir,
        logger,
      });
      jest.spyOn(logger, 'error');
      jest.spyOn(logger, 'info');

      const actualExitCode = await runCli(['myFunction', '--help'], context);

      expect(actualExitCode).toEqual(0);
      expect(logger.error).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Usage: cs myFunction'),
      );
    });

    it('should log a message and return 1 when a function error occurs', async () => {
      const logger = pino();
      const context = await WorkspaceContext.init({
        workingDirectory: tmpDir,
        logger,
      });
      jest.spyOn(logger, 'error');

      const actualExitCode = await runCli(['myFunction', '💥'], context);

      expect(actualExitCode).toEqual(1);
      expect(logger.error).toHaveBeenCalledExactlyOnceWith('❌ 🚨');
    });

    it('should show help and return 1 when no argument is passed', async () => {
      const logger = pino();
      const context = await WorkspaceContext.init({
        workingDirectory: tmpDir,
        logger,
      });
      jest.spyOn(logger, 'error');
      jest.spyOn(logger, 'info');

      const actualExitCode = await runCli([], context);

      expect(actualExitCode).toEqual(1);
      expect(logger.info).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Usage:'),
      );
    });

    it('should rethrow a ModuleLoadingError when requested', async () => {
      await writeConfiguration(tmpDir, 'causa.yaml', {
        workspace: { name: 'my-workspace' },
        causa: { modules: { pino: '0.0.1' } },
      });

      const actualPromise = runCli(['myFunction'], {
        workingDirectory: tmpDir,
        rethrowModuleLoadingError: true,
      });

      await expect(actualPromise).rejects.toThrow(ModuleLoadingError);
    });
  });
});
