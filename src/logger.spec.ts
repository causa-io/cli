import { jest } from '@jest/globals';
import 'jest-extended';
import { createLogger } from './logger.js';

describe('logger', () => {
  describe('createLogger', () => {
    it('should keep escape sequences in messages', () => {
      jest.spyOn(process.stderr, 'write').mockReturnValue(true);
      const logger = createLogger();

      // Bold is used rather than a color, because the message is colored when colors are supported (e.g. in the CI),
      // which replaces the color resets it contains.
      logger.info('\x1b[1mINFO\x1b[22m from a command');

      expect(process.stderr.write).toHaveBeenCalledExactlyOnceWith(
        expect.stringContaining('\x1b[1mINFO\x1b[22m from a command'),
      );
    });
  });
});
