/**
 * An error thrown during the bootstrap process.
 */
export class BootstrapError extends Error {}

/**
 * An error thrown when installing Causa dependencies using npm fails.
 */
export class ModuleInstallationError extends BootstrapError {
  constructor() {
    super('Installation of Causa modules using npm failed.');
  }
}

/**
 * An error thrown when running the CLI in a worker thread fails.
 */
export class CliWorkerError extends BootstrapError {
  constructor(exitCode: number) {
    super(
      `Failed to run the CLI in a worker thread, returned exit code ${exitCode}.`,
    );
  }
}
