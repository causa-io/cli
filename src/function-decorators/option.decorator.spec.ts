/* eslint @typescript-eslint/no-empty-function: 0 */
import 'jest-extended';
import { CliOption, getCliOptionDefinitions } from './option.decorator.js';

describe('CliOption decorator', () => {
  describe('getCliOptionDefinitions', () => {
    it('should return an empty array for a class without decorators', () => {
      class MyNonFunction {
        option1?: boolean;
        option2?: string;
      }

      const actualOptions = getCliOptionDefinitions(MyNonFunction);

      expect(actualOptions).toBeEmpty();
    });

    it('should return the list of options', () => {
      const expectedOption1 = {
        flags: '-o, --option1',
      };
      const expectedOption2 = {
        flags: '--option2 <option2>',
        description: '📕',
      };
      class MyFunction {
        async _call(): Promise<void> {}
        _supports() {
          return true;
        }

        @CliOption(expectedOption1)
        option1?: boolean;

        @CliOption(expectedOption2)
        option2?: string;
      }

      const actualOptions = getCliOptionDefinitions(MyFunction);

      expect(
        actualOptions.sort((o1, o2) =>
          o1.propertyKey.localeCompare(o2.propertyKey),
        ),
      ).toEqual([
        { ...expectedOption1, propertyKey: 'option1' },
        { ...expectedOption2, propertyKey: 'option2' },
      ]);
    });
  });
});
