import {
  CliCommand,
  ParentCliCommandDefinition,
  getCliCommandDefinition,
} from './command.decorator.js';

describe('CliCommand decorator', () => {
  describe('getCliCommandDefinition', () => {
    it('should return the command definition', () => {
      const expectedParent: ParentCliCommandDefinition = {
        name: 'parent',
      };
      const expectedCommand = {
        parent: expectedParent,
        name: 'myCommand',
        description: '📚',
        aliases: ['mc'],
        outputFn: console.log,
        summary: '📝',
      };
      @CliCommand(expectedCommand)
      class MyFunction {
        _call(): void {}
        _supports() {
          return true;
        }
      }

      const actualCommand = getCliCommandDefinition(MyFunction);

      expect(actualCommand).toEqual(expectedCommand);
    });
  });
});
