import { jest } from '@jest/globals';
import { Command } from 'commander';
import 'jest-extended';
import { pino } from 'pino';
import { showHelpForCommand } from './command-help.js';

describe('command-help', () => {
  describe('showHelpForCommand', () => {
    it('should print the help using the given logger', () => {
      const logger = pino();
      jest.spyOn(logger, 'info');
      const command = new Command('my-command');

      showHelpForCommand(command, logger);

      expect(logger.info).toHaveBeenCalledOnceWith(
        expect.stringContaining('my-command'),
      );
    });
  });
});
