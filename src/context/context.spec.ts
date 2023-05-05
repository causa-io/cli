import { WorkspaceContext } from '@causa/workspace';
import { jest } from '@jest/globals';
import { Command } from 'commander';
import { mkdtemp, rm } from 'fs/promises';
import 'jest-extended';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { writeConfiguration } from '../utils.test.js';
import { CliContext } from './context.js';
import {
  MyFunction,
  MyFunctionImpl,
  outputObject,
} from './context.module.test.js';

describe('CliContext', () => {
  describe('wrapAction', () => {
    let tmpDir: string;
    let workspace: WorkspaceContext;
    let context: CliContext;
    let initialExitCode: number | undefined;

    beforeEach(async () => {
      initialExitCode = process.exitCode;

      tmpDir = resolve(await mkdtemp('causa-tests-'));
      await writeConfiguration(tmpDir, 'causa.yaml', {
        workspace: { name: 'my-workspace' },
      });

      workspace = await WorkspaceContext.init({
        workingDirectory: tmpDir,
      });
      const command = new Command();
      context = new CliContext(command, workspace);
    });

    afterEach(async () => {
      await rm(tmpDir, { recursive: true, force: true });
    });

    it('should run the function', async () => {
      const fn: jest.Mock<() => Promise<void>> = jest.fn();
      fn.mockResolvedValueOnce();

      await context.wrapAction(fn);

      expect(fn).toHaveBeenCalledOnce();
      expect(process.exitCode).toEqual(initialExitCode);
    });

    it('should log an error and change the process exit code', async () => {
      const fn: jest.Mock<() => Promise<void>> = jest.fn();
      fn.mockRejectedValueOnce(new Error('💣'));
      jest.spyOn(workspace.logger, 'error');

      await context.wrapAction(fn);

      expect(fn).toHaveBeenCalledOnce();
      expect(process.exitCode).toEqual(1);
      expect(workspace.logger.error).toHaveBeenCalledOnceWith('❌ 💣');
      process.exitCode = initialExitCode;
    });
  });

  describe('runWorkspaceFunctionAsAction', () => {
    let tmpDir: string;
    let command: Command;
    let workspace: WorkspaceContext;
    let context: CliContext;
    let initialExitCode: number | undefined;

    beforeEach(async () => {
      initialExitCode = process.exitCode;

      tmpDir = resolve(await mkdtemp('causa-tests-'));
      await writeConfiguration(tmpDir, './causa.yaml', {
        workspace: { name: 'my-workspace' },
        causa: {
          modules: [
            fileURLToPath(new URL('./context.module.test.ts', import.meta.url)),
          ],
        },
      });

      workspace = await WorkspaceContext.init({
        workingDirectory: tmpDir,
      });
      command = new Command();
      context = new CliContext(command, workspace);
    });

    afterEach(async () => {
      await rm(tmpDir, { recursive: true, force: true });
    });

    it('should run the function', async () => {
      jest.spyOn(MyFunctionImpl.prototype, '_call');

      await context.runWorkspaceFunctionAsAction(MyFunction, { arg: '🎉' });

      expect(process.exitCode).toEqual(initialExitCode);
      expect(MyFunctionImpl.prototype._call).toHaveBeenCalledOnce();
    });

    it('should run the function and call the output function', async () => {
      let output!: string;

      await context.runWorkspaceFunctionAsAction(
        MyFunction,
        { arg: '🎉' },
        { outputFn: (o) => (output = o) },
      );

      expect(output).toEqual('🎉');
      expect(process.exitCode).toEqual(initialExitCode);
    });

    it('should validate arguments', async () => {
      jest.spyOn(workspace.logger, 'error');

      await context.runWorkspaceFunctionAsAction(MyFunction, {
        arg: 123 as any,
      });

      expect(workspace.logger.error).toHaveBeenCalledOnceWith(
        expect.stringContaining('arg'),
      );
      expect(process.exitCode).toEqual(1);
      process.exitCode = initialExitCode;
    });

    it('should register commands from the workspace functions', async () => {
      outputObject.outputValue = undefined;

      await command.parseAsync(['node', 'script.ts', 'myFunction', '🎉']);

      expect(outputObject.outputValue).toEqual('🎉');
    });
  });
});
