import { fileURLToPath } from 'url';
import { CliWorkerError } from './errors.js';
import { runCliInWorkerThread } from './worker.js';

describe('worker', () => {
  describe('runCliInWorkerThread', () => {
    let testCliLocation = fileURLToPath(
      new URL('./worker.cli.test.js', import.meta.url),
    );

    it('should return the exit code returned by runCli', async () => {
      const actualExitCode = await runCliInWorkerThread(
        testCliLocation,
        ['123'],
        {},
      );

      expect(actualExitCode).toEqual(123);
    });

    it('should throw an error if runCli returns a non-zero exit code', async () => {
      const actualPromise = runCliInWorkerThread(testCliLocation, [], {
        workingDirectory: 'exitCode',
      });

      await expect(actualPromise).rejects.toThrow(CliWorkerError);
    });

    it('should throw an error if the worker thread throws an error', async () => {
      const actualPromise = runCliInWorkerThread(testCliLocation, [], {
        workingDirectory: 'error',
      });

      await expect(actualPromise).rejects.toThrow('🚨');
    });
  });
});
