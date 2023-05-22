import { parentPort, workerData } from 'node:worker_threads';

export class MyError extends Error {}

const { args, cliOptions } = workerData;

if (cliOptions.workingDirectory === 'error') {
  throw new MyError('🚨');
} else if (cliOptions.workingDirectory === 'exitCode') {
  process.exit(1);
}

parentPort?.postMessage(parseInt(args[0]));
