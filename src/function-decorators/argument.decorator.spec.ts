import {
  CliArgument,
  getCliArgumentDefinitions,
} from './argument.decorator.js';
import { InvalidCliArgumentDefinition } from './errors.js';

describe('CliArgument decorator', () => {
  describe('getCliArgumentDefinitions', () => {
    it('should return the arguments in order', () => {
      const expectedFirstArgument = {
        name: 'myFirstArg',
        position: 0,
      };
      const expectedSecondArgument = {
        name: 'mySecondArg',
        position: 1,
        description: '📝',
      };
      const expectedThirdArgument = {
        name: 'myThirdArg',
        position: 2,
      };
      class MyFunction {
        async _call(): Promise<void> {}
        _supports() {
          return true;
        }

        @CliArgument(expectedSecondArgument)
        secondArg!: string;

        @CliArgument(expectedFirstArgument)
        firstArg!: string;

        @CliArgument(expectedThirdArgument)
        thirdArg!: string;
      }

      const actualArguments = getCliArgumentDefinitions(MyFunction);

      expect(actualArguments).toEqual([
        { ...expectedFirstArgument, propertyKey: 'firstArg' },
        { ...expectedSecondArgument, propertyKey: 'secondArg' },
        { ...expectedThirdArgument, propertyKey: 'thirdArg' },
      ]);
    });

    it('should throw when positions are not contiguous', () => {
      class MyFunction {
        async _call(): Promise<void> {}
        _supports() {
          return true;
        }

        @CliArgument({ name: 'secondArg', position: 3 })
        secondArg!: string;

        @CliArgument({ name: 'firstArg', position: 0 })
        firstArg!: string;
      }

      expect(() => getCliArgumentDefinitions(MyFunction)).toThrow(
        InvalidCliArgumentDefinition,
      );
    });
  });
});
