import { WorkspaceContext } from '@causa/workspace';
import { InvalidFunctionArgumentError } from '@causa/workspace/function-registry';
import { jest } from '@jest/globals';
import { Command } from 'commander';
import { mkdtemp, rm } from 'fs/promises';
import 'jest-extended';
import { tmpdir } from 'os';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { writeConfiguration } from '../utils.test.js';
import { CliContext } from './context.js';
import {
  MyFunction,
  MyFunctionImpl,
  outputObject,
} from './context.module.test.js';

describe('CliContext', () => {
  describe('runWorkspaceFunctionAsAction', () => {
    let tmpDir: string;
    let command: Command;
    let workspace: WorkspaceContext;
    let context: CliContext;
    let initialExitCode: number | undefined;

    beforeEach(async () => {
      initialExitCode = process.exitCode;

      tmpDir = await mkdtemp(join(tmpdir(), 'causa-tests-'));
      await writeConfiguration(tmpDir, './causa.yaml', {
        workspace: { name: 'my-workspace' },
        causa: {
          modules: {
            // Sneaky trick to import a local file as a module (which is not a valid package).
            // The version should be a local path such that it is not checked.
            [fileURLToPath(
              new URL('./context.module.test.ts', import.meta.url),
            )]: 'file:/some/path',
          },
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
      let args!: any;

      await context.runWorkspaceFunctionAsAction(
        MyFunction,
        { arg: '🎉' },
        {
          outputFn: (o, a) => {
            output = o;
            args = a;
          },
        },
      );

      expect(output).toEqual('🎉');
      expect(args).toEqual({ arg: '🎉' });
      expect(process.exitCode).toEqual(initialExitCode);
    });

    it('should validate arguments', async () => {
      jest.spyOn(workspace.logger, 'error');

      const actualPromise = context.runWorkspaceFunctionAsAction(MyFunction, {
        arg: 123 as any,
      });

      await expect(actualPromise).rejects.toThrow(InvalidFunctionArgumentError);
    });

    it('should register commands from the workspace functions', async () => {
      outputObject.outputValue = undefined;

      await command.parseAsync(['node', 'script.ts', 'myFunction', '🎉']);

      expect(outputObject.outputValue).toEqual('🎉');
    });
  });
});
