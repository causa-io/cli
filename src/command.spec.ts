import { CommanderError } from 'commander';
import { parseGlobalOptions } from './command.js';

describe('command', () => {
  describe('parseGlobalOptions', () => {
    it('should return an empty object when no options are provided', () => {
      const actualOptions = parseGlobalOptions([]);

      expect(actualOptions).toEqual({});
    });

    it('should return the options', () => {
      const actualOptions = parseGlobalOptions([
        '-w',
        '/some/path',
        '-v',
        '-e',
        'dev',
        '--unknown',
        '-u',
      ]);

      expect(actualOptions).toEqual({
        workingDirectory: '/some/path',
        verbose: true,
        environment: 'dev',
      });
    });

    it('should throw when the provided option is invalid', () => {
      expect(() => parseGlobalOptions(['-w'])).toThrow(CommanderError);
    });
  });
});
