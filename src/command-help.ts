// Although this could be located in `command.ts`, this helps mocking the bootstrapping tests.

import { Command } from 'commander';
import type { Logger } from 'pino';

/**
 * Shows the help for a command using the given logger.
 *
 * @param command The command for which to show the help.
 * @param logger The logger to use.
 */
export function showHelpForCommand(command: Command, logger: Logger) {
  logger.info(command.helpInformation());
}
