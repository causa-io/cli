/* eslint @typescript-eslint/no-empty-function: 0 */
import { WorkspaceFunction } from '@causa/workspace';
import { jest } from '@jest/globals';
import { Command } from 'commander';
import 'jest-extended';
import {
  CliArgument,
  CliCommand,
  CliOption,
  type ParentCliCommandDefinition,
} from '../function-decorators/index.js';
import { DuplicateParentCommandDefinitionError } from './errors.js';
import {
  type WorkspaceFunctionCommandRunner,
  WorkspaceFunctionCommandsBuilder,
} from './function-commands-builder.js';

const outputFn = async () => {};

@CliCommand({
  name: 'myCommand',
  aliases: ['mc'],
  description: '📚',
  summary: '📓',
  outputFn,
})
class RootCommand extends WorkspaceFunction<void> {
  _call(): void {}
  _supports(): boolean {
    return true;
  }

  @CliArgument({ name: '<firstArg>', position: 0, description: '1️⃣' })
  readonly arg1!: string;

  @CliArgument({ name: '[secondArg]', position: 1, description: '2️⃣' })
  readonly arg2?: number;

  @CliOption({ flags: '-o, --firstOption <opt>', description: '🤷' })
  readonly option1?: string;

  @CliOption({ flags: '-p, --option2', description: '☯️' })
  readonly option2?: boolean;
}

describe('WorkspaceFunctionCommandsBuilder', () => {
  let command: Command;
  let runner: jest.Mock<WorkspaceFunctionCommandRunner>;
  let builder: WorkspaceFunctionCommandsBuilder;

  beforeEach(() => {
    command = new Command();
    runner = jest.fn();
    builder = new WorkspaceFunctionCommandsBuilder(command, runner as any);
  });

  describe('buildCommand', () => {
    it('should do nothing for a class without a CLI definition', () => {
      class NotACommand extends WorkspaceFunction<void> {
        _call(): void {}
        _supports(): boolean {
          return true;
        }
      }

      builder.buildCommand(NotACommand);

      expect(command.commands).toBeEmpty();
    });

    it('should create a command at the root', () => {
      builder.buildCommand(RootCommand);

      expect(command.commands).toHaveLength(1);
      const actualCommand = command.commands[0];
      expect(actualCommand.name()).toEqual('myCommand');
      expect(actualCommand.aliases()).toEqual(['mc']);
      expect(actualCommand.description()).toEqual('📚');
      expect(actualCommand.summary()).toEqual('📓');
      expect(actualCommand).toMatchObject({
        _args: [
          {
            _name: 'firstArg',
            description: '1️⃣',
            required: true,
            variadic: false,
          },
          {
            _name: 'secondArg',
            description: '2️⃣',
            required: false,
            variadic: false,
          },
        ],
      });
      expect(
        [...actualCommand.options].sort((o1, o2) =>
          o1.name().localeCompare(o2.name()),
        ),
      ).toEqual([
        expect.objectContaining({
          short: '-o',
          long: '--firstOption',
          description: '🤷',
          required: true,
        }),
        expect.objectContaining({
          short: '-p',
          long: '--option2',
          description: '☯️',
          required: false,
        }),
      ]);
    });

    it('should create a nested command', () => {
      const parent1: ParentCliCommandDefinition = {
        name: 'parent1',
        aliases: ['p1'],
        description: '👴',
        summary: '👵',
      };
      const parent2: ParentCliCommandDefinition = {
        parent: parent1,
        name: 'parent2',
      };
      @CliCommand({ parent: parent2, name: 'child' })
      class ChildCommand extends WorkspaceFunction<void> {
        _call(): void {}
        _supports(): boolean {
          return true;
        }
      }

      builder.buildCommand(ChildCommand);

      expect(command.commands).toHaveLength(1);
      const actualParent1 = command.commands[0];
      expect(actualParent1.name()).toEqual('parent1');
      expect(actualParent1.aliases()).toEqual(['p1']);
      expect(actualParent1.description()).toEqual('👴');
      expect(actualParent1.summary()).toEqual('👵');
      expect(actualParent1.commands).toHaveLength(1);
      const actualParent2 = actualParent1.commands[0];
      expect(actualParent2.name()).toEqual('parent2');
      expect(actualParent2.commands).toHaveLength(1);
      const actualChild = actualParent2.commands[0];
      expect(actualChild.name()).toEqual('child');
    });

    it('should throw if two parent names conflict', () => {
      const parent1: ParentCliCommandDefinition = { name: 'parent' };
      const parent2: ParentCliCommandDefinition = { name: 'parent' };
      @CliCommand({ parent: parent1, name: 'child1' })
      class Child1 extends WorkspaceFunction<void> {
        _call(): void {}
        _supports(): boolean {
          return true;
        }
      }
      @CliCommand({ parent: parent2, name: 'child2' })
      class Child2 extends WorkspaceFunction<void> {
        _call(): void {}
        _supports(): boolean {
          return true;
        }
      }

      expect(() => builder.buildCommands([Child1, Child2])).toThrow(
        DuplicateParentCommandDefinitionError,
      );
    });

    it('should construct the function arguments and call the runner', async () => {
      builder.buildCommand(RootCommand);
      await command.parseAsync([
        'node',
        'script.ts',
        'myCommand',
        '🐶',
        '-o',
        '🎲',
      ]);

      expect(runner).toHaveBeenCalledWith(
        RootCommand,
        { arg1: '🐶', option1: '🎲' },
        outputFn,
      );
    });

    it('should correctly handle optional arguments', async () => {
      builder.buildCommand(RootCommand);
      await command.parseAsync(['node', 'script.ts', 'mc', '🐶', '🐱', '-p']);

      expect(runner).toHaveBeenCalledWith(
        RootCommand,
        { arg1: '🐶', arg2: '🐱', option2: true },
        outputFn,
      );
    });
  });
});
