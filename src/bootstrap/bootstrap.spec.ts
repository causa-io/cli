import { IncompatibleModuleVersionError } from '@causa/workspace';
import { jest } from '@jest/globals';
import { Command } from 'commander';
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'fs/promises';
import 'jest-extended';
import { tmpdir } from 'os';
import { join } from 'path';
import type { Logger } from 'pino';

const runCliMock = jest.fn(async () => 0);
const runCliInWorkerThreadMock = jest.fn(async () => 0);
const showHelpForCommandMock = jest.fn();
jest.unstable_mockModule('../cli.js', () => ({ runCli: runCliMock }));
jest.unstable_mockModule('./worker.js', () => ({
  runCliInWorkerThread: runCliInWorkerThreadMock,
}));
jest.unstable_mockModule('../command-help.js', () => ({
  showHelpForCommand: showHelpForCommandMock,
}));

describe('bootstrap', () => {
  let bootstrapCli: (args: string[]) => Promise<number>;

  beforeEach(async () => {
    ({ bootstrapCli } = await import('./bootstrap.js'));
  });

  describe('bootstrapCli', () => {
    let tmpDir: string;

    beforeEach(async () => {
      tmpDir = await mkdtemp(join(tmpdir(), 'causa-tests-'));
      await writeFile(
        join(tmpDir, 'causa.yaml'),
        JSON.stringify({
          workspace: { name: 'my-workspace' },
          causa: {
            modules: {
              'local-package': 'file:/some/absolute/path',
              'is-even': '1.0.0',
            },
          },
        }),
      );
    });

    afterEach(async () => {
      await rm(tmpDir, { recursive: true, force: true });
    });

    it('should set up the Causa folder in the workspace', async () => {
      const actualExitCode = await bootstrapCli(['-w', tmpDir]);

      expect(actualExitCode).toEqual(0);
      const actualPackageFile = await readFile(
        join(tmpDir, '.causa', 'package.json'),
      );
      const actualPackageDefinition = JSON.parse(actualPackageFile.toString());
      expect(actualPackageDefinition).toEqual({
        dependencies: {
          '@causa/cli': '*',
          'local-package': 'file:/some/absolute/path',
          'is-even': '1.0.0',
        },
      });
      expect(runCliMock).not.toHaveBeenCalled();
      expect(runCliInWorkerThreadMock).toHaveBeenCalledExactlyOnceWith(
        join(tmpDir, '.causa', 'node_modules/@causa/cli/dist/bootstrap/cli.js'),
        ['-w', tmpDir],
        { workingDirectory: tmpDir, rethrowModuleLoadingError: false },
      );
    }, 60000);

    it('should clear dependencies in an existing Causa folder that does not contain the CLI', async () => {
      await mkdir(join(tmpDir, '.causa', 'node_modules'), { recursive: true });
      await writeFile(join(tmpDir, '.causa', 'package.json'), 'some-old-stuff');
      const fileToDelete = join(tmpDir, '.causa', 'node_modules', 'other.file');
      await writeFile(fileToDelete, '🧓');

      const actualExitCode = await bootstrapCli(['-w', tmpDir]);

      expect(actualExitCode).toEqual(0);
      const actualPackageFile = await readFile(
        join(tmpDir, '.causa', 'package.json'),
      );
      const actualPackageDefinition = JSON.parse(actualPackageFile.toString());
      expect(actualPackageDefinition).toEqual({
        dependencies: {
          '@causa/cli': '*',
          'local-package': 'file:/some/absolute/path',
          'is-even': '1.0.0',
        },
      });
      await expect(stat(fileToDelete)).rejects.toThrow('ENOENT');
      expect(runCliMock).not.toHaveBeenCalled();
      expect(runCliInWorkerThreadMock).toHaveBeenCalledExactlyOnceWith(
        join(tmpDir, '.causa', 'node_modules/@causa/cli/dist/bootstrap/cli.js'),
        ['-w', tmpDir],
        { workingDirectory: tmpDir, rethrowModuleLoadingError: false },
      );
    }, 60000);

    it('should not set up an existing Causa folder', async () => {
      const cliDir = join(
        tmpDir,
        '.causa',
        'node_modules/@causa/cli/dist/bootstrap',
      );
      const cliFile = join(cliDir, 'cli.js');
      await mkdir(cliDir, { recursive: true });
      // The presence of the CLI file is enough to consider the Causa folder as initialized.
      await writeFile(cliFile, '🔨');
      await writeFile(join(tmpDir, '.causa', 'package.json'), 'some-old-stuff');

      const actualExitCode = await bootstrapCli(['-w', tmpDir]);

      expect(actualExitCode).toEqual(0);
      const actualPackageFile = await readFile(
        join(tmpDir, '.causa', 'package.json'),
      );
      expect(actualPackageFile.toString()).toEqual('some-old-stuff');
      expect(runCliMock).not.toHaveBeenCalled();
      expect(runCliInWorkerThreadMock).toHaveBeenCalledExactlyOnceWith(
        join(tmpDir, '.causa', 'node_modules/@causa/cli/dist/bootstrap/cli.js'),
        ['-w', tmpDir],
        { workingDirectory: tmpDir, rethrowModuleLoadingError: true },
      );
    });

    it('should return 1 when installing the dependencies fails', async () => {
      await writeFile(
        join(tmpDir, 'causa.yaml'),
        JSON.stringify({
          workspace: { name: 'my-workspace' },
          causa: { modules: { 'ThisIsNotEvenAValidPackageName 💥': '1.0.0' } },
        }),
      );

      const actualExitCode = await bootstrapCli(['-w', tmpDir]);

      expect(actualExitCode).toEqual(1);
      const actualPackageFile = await readFile(
        join(tmpDir, '.causa', 'package.json'),
      );
      const actualPackageDefinition = JSON.parse(actualPackageFile.toString());
      expect(actualPackageDefinition).toEqual({
        dependencies: {
          '@causa/cli': '*',
          'ThisIsNotEvenAValidPackageName 💥': '1.0.0',
        },
      });
      expect(runCliMock).not.toHaveBeenCalled();
      expect(runCliInWorkerThreadMock).not.toHaveBeenCalled();
    }, 60000);

    it('should not override a specified version for the CLI', async () => {
      await writeFile(
        join(tmpDir, 'causa.yaml'),
        JSON.stringify({
          workspace: { name: 'my-workspace' },
          causa: { modules: { '@causa/cli': '0.1.0' } },
        }),
      );
      const actualExitCode = await bootstrapCli(['-w', tmpDir]);

      expect(actualExitCode).toEqual(0);
      const actualPackageFile = await readFile(
        join(tmpDir, '.causa', 'package.json'),
      );
      const actualPackageDefinition = JSON.parse(actualPackageFile.toString());
      expect(actualPackageDefinition).toEqual({
        dependencies: {
          '@causa/cli': '0.1.0',
        },
      });
      expect(runCliMock).not.toHaveBeenCalled();
      expect(runCliInWorkerThreadMock).toHaveBeenCalledExactlyOnceWith(
        join(tmpDir, '.causa', 'node_modules/@causa/cli/dist/bootstrap/cli.js'),
        ['-w', tmpDir],
        { workingDirectory: tmpDir, rethrowModuleLoadingError: false },
      );
    }, 60000);

    it('should return 1 when global options are invalid', async () => {
      const actualExitCode = await bootstrapCli(['-w']);

      expect(actualExitCode).toEqual(1);
      expect(runCliMock).not.toHaveBeenCalled();
      expect(runCliInWorkerThreadMock).not.toHaveBeenCalled();
    });

    it('should print the help in case of a configuration error', async () => {
      // Setting the `-v` argument also allows to check that the bootstrap-specific logger is correctly initialized.
      const actualExitCode = await bootstrapCli(['-w', tmpdir(), '-v']);

      expect(actualExitCode).toEqual(1);
      expect(runCliMock).not.toHaveBeenCalled();
      expect(runCliInWorkerThreadMock).not.toHaveBeenCalled();
      expect(showHelpForCommandMock).toHaveBeenCalledExactlyOnceWith(
        expect.toSatisfy((command: Command) => command.name() === 'cs'),
        expect.toSatisfy((logger: Logger) => logger.level === 'debug'),
      );
    });

    it('should reinstall dependencies when module versions do not match', async () => {
      const cliDir = join(
        tmpDir,
        '.causa',
        'node_modules',
        '@causa',
        'cli',
        'dist',
        'bootstrap',
      );
      const cliFile = join(cliDir, 'cli.js');
      await mkdir(cliDir, { recursive: true });
      // The presence of the CLI file is enough to consider the Causa folder as initialized.
      await writeFile(cliFile, '🔨');
      await writeFile(join(tmpDir, '.causa', 'package.json'), 'some-old-stuff');
      const isEvenDir = join(tmpDir, '.causa', 'node_modules', 'is-even');
      await mkdir(isEvenDir, { recursive: true });
      await writeFile(
        join(isEvenDir, 'package.json'),
        JSON.stringify({ version: '0.0.1' }),
      );
      runCliInWorkerThreadMock.mockRejectedValueOnce(
        new IncompatibleModuleVersionError('is-even', '0.0.1', '1.0.0'),
      );

      const actualExitCode = await bootstrapCli(['-w', tmpDir]);

      expect(actualExitCode).toEqual(0);
      const actualPackageFile = await readFile(
        join(tmpDir, '.causa', 'package.json'),
      );
      const actualPackageDefinition = JSON.parse(actualPackageFile.toString());
      expect(actualPackageDefinition).toEqual({
        dependencies: {
          '@causa/cli': '*',
          'local-package': 'file:/some/absolute/path',
          'is-even': '1.0.0',
        },
      });
      expect(runCliInWorkerThreadMock).toHaveBeenCalledTimes(2);
      expect(runCliInWorkerThreadMock).toHaveBeenCalledWith(
        join(tmpDir, '.causa', 'node_modules/@causa/cli/dist/bootstrap/cli.js'),
        ['-w', tmpDir],
        { workingDirectory: tmpDir, rethrowModuleLoadingError: true },
      );
      expect(runCliInWorkerThreadMock).toHaveBeenCalledWith(
        join(tmpDir, '.causa', 'node_modules/@causa/cli/dist/bootstrap/cli.js'),
        ['-w', tmpDir],
        { workingDirectory: tmpDir },
      );
    });
  });
});
