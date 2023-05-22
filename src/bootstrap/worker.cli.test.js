import { parentPort, workerData } from 'node:worker_threads';

const { args, cliOptions } = workerData;

if (cliOptions.workingDirectory === 'error') {
  throw new Error('🚨');
} else if (cliOptions.workingDirectory === 'exitCode') {
  process.exit(1);
}

parentPort?.postMessage(parseInt(args[0]));
