/**
 * @fileoverview
 * This file is meant to be run as a worker thread, to execute {@link runCli}.
 * The `workerData` should contain the arguments and options to pass to {@link runCli}, namely `args` and `cliOptions`.
 * The exit code will be sent back to the parent thread.
 */

import { parentPort, workerData } from 'node:worker_threads';
import { runCli } from '../cli.js';

const { args, cliOptions } = workerData;

const exitCode = await runCli(args, cliOptions);

parentPort?.postMessage(exitCode);
