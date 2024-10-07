import { Worker } from 'worker_threads';
import type { RunCliOptions } from '../cli.js';
import { CliWorkerError } from './errors.js';

/**
 * Executes `runCli` in a worker thread, using the given CLI script location.
 *
 * @param causaCliLocation The location of the CLI script.
 * @param args Arguments to pass to `runCli`.
 * @param cliOptions Options to pass to `runCli`.
 * @returns The exit code returned by `runCli`.
 */
export async function runCliInWorkerThread(
  causaCliLocation: string,
  args: string[],
  cliOptions: RunCliOptions,
): Promise<number> {
  const worker = new Worker(causaCliLocation, {
    workerData: { args, cliOptions },
  });

  return new Promise<number>((resolve, reject) => {
    worker.on('message', (code: number) => resolve(code));
    worker.on('error', (error) => reject(error));
    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new CliWorkerError(code));
      }
    });
  });
}
