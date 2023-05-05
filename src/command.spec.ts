import { mkdtemp, rm } from 'fs/promises';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { runCli } from './command.js';
import { outputObject } from './command.module.test.js';
import { writeConfiguration } from './utils.test.js';

describe('command', () => {
  describe('runCli', () => {
    let tmpDir: string;
    let initialExitCode: number | undefined;
    let initialArgs: string[];
    let initialCwd: string;

    beforeEach(async () => {
      initialExitCode = process.exitCode;
      initialArgs = process.argv;
      initialCwd = process.cwd();
      outputObject.workspace = undefined;

      tmpDir = resolve(await mkdtemp('causa-tests-'));
      await writeConfiguration(tmpDir, 'causa.yaml', {
        workspace: { name: 'my-workspace' },
        environments: { dev: { name: '🪛' } },
        causa: {
          modules: {
            [fileURLToPath(
              new URL('./command.module.test.ts', import.meta.url),
            )]: '',
          },
        },
      });
    });

    afterEach(async () => {
      await rm(tmpDir, { recursive: true, force: true });
      process.argv = initialArgs;
    });

    it('should return an error when the directory is not a workspace', async () => {
      process.argv = initialArgs.slice(0, 2);

      await runCli();

      expect(process.exitCode).toEqual(1);
      process.exitCode = initialExitCode;
    });

    it('should default to the current working directory', async () => {
      process.argv = [...initialArgs.slice(0, 2), 'myFunction'];
      process.chdir(tmpDir);

      await runCli();

      expect(process.exitCode).toEqual(initialExitCode);
      expect(outputObject.workspace?.rootPath).toEqual(tmpDir);
      expect(outputObject.workspace?.projectPath).toBeNull();
      expect(outputObject.workspace?.environment).toBeNull();
      process.chdir(initialCwd);
    });

    it('should select the correct environment', async () => {
      process.argv = [
        ...initialArgs.slice(0, 2),
        '-w',
        tmpDir,
        'myFunction',
        '-e',
        'dev',
      ];

      await runCli();

      expect(process.exitCode).toEqual(initialExitCode);
      expect(outputObject.workspace?.rootPath).toEqual(tmpDir);
      expect(outputObject.workspace?.projectPath).toBeNull();
      expect(outputObject.workspace?.environment).toEqual('dev');
    });

    it('should select the correct working directory', async () => {
      process.argv = [...initialArgs.slice(0, 2), '-w', tmpDir, 'myFunction'];

      await runCli();

      expect(process.exitCode).toEqual(initialExitCode);
      expect(outputObject.workspace?.rootPath).toEqual(tmpDir);
      expect(outputObject.workspace?.projectPath).toBeNull();
      expect(outputObject.workspace?.environment).toBeNull();
    });
  });
});
