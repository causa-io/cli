import { WorkspaceContext } from '@causa/workspace';
import { jest } from '@jest/globals';
import { mkdtemp, rm } from 'fs/promises';
import 'jest-extended';
import { resolve } from 'path';
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

      tmpDir = resolve(await mkdtemp('causa-tests-'));
      await writeConfiguration(tmpDir, 'causa.yaml', {
        workspace: { name: 'my-workspace' },
        environments: { dev: { name: '🪛' } },
        causa: {
          modules: {
            [fileURLToPath(new URL('./cli.module.test.ts', import.meta.url))]:
              '',
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
      expect(outputObject.workspace?.rootPath).toEqual(tmpDir);
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
      expect(logger.info).toHaveBeenCalledOnceWith('👋');
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
      expect(logger.error).toHaveBeenCalledOnce();
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
      expect(logger.error).toHaveBeenCalledOnceWith('❌ 🚨');
    });
  });
});
