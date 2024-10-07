import { WorkspaceFunction } from '@causa/workspace';
import type {
  ImplementableFunctionArguments,
  ImplementableFunctionDefinitionConstructor,
  ImplementableFunctionReturnType,
} from '@causa/workspace/function-registry';
import 'reflect-metadata';

/**
 * The reflect metadata key where the {@link CliCommandDefinition} is stored for a decorated workspace function.
 */
const CLI_COMMAND_METADATA_KEY = 'causa.CliCommand';

/**
 * The definition for a parent command.
 * A parent command does not have any implementation, but regroups related sub-commands together.
 */
export type ParentCliCommandDefinition = Pick<
  CliCommandDefinition<any>,
  'name' | 'description' | 'summary' | 'aliases' | 'parent'
>;

/**
 * A function processing the output of a workspace function.
 */
export type CliCommandOutputFunction<D extends WorkspaceFunction<any>> = (
  output: Awaited<ImplementableFunctionReturnType<D>>,
  args: ImplementableFunctionArguments<D>,
) => Promise<any> | any;

/**
 * The definition of a CLI command, without its arguments and options.
 */
export type CliCommandDefinition<D extends WorkspaceFunction<any>> = {
  /**
   * The name of the command.
   */
  name: string;

  /**
   * The description that will appear in the command line help.
   */
  description?: string;

  /**
   * The summary displayed when the command is listed as a sub-command.
   */
  summary?: string;

  /**
   * A list of aliases that can be used instead of the full {@link CliCommandDefinition.name}.
   */
  aliases?: string[];

  /**
   * A function called with the output for the workspace function, usually printing the returned value of the function
   * to the standard output.
   */
  outputFn?: CliCommandOutputFunction<D>;

  /**
   * The parent command under which this command should be listed.
   * By default, commands are added to the root of the CLI.
   */
  parent?: ParentCliCommandDefinition;
};

/**
 * Decorates a workspace function that can be used directly as a CLI command.
 *
 * @example
 * ```typescript
 * @CliCommand({
 *   name: 'myFunction',
 *   outputFn: console.log,
 * })
 * export class MyFunction extends WorkspaceFunction<string> {
 *   _call(): string {
 *     return '🎉';
 *   }
 *
 *   _supports(): boolean {
 *     return true;
 *   }
 *
 *   @CliArgument({ name: '<requiredArg>', position: 0 })
 *   arg!: string;
 *
 *   @CliOption({ flags: '-o <option>' })
 *   option?: string;
 * }
 * ```
 *
 * @param definition The definition of the CLI command.
 */
export function CliCommand<D extends WorkspaceFunction<any>>(
  definition: CliCommandDefinition<D>,
) {
  return (target: ImplementableFunctionDefinitionConstructor<D>) => {
    Reflect.defineMetadata(CLI_COMMAND_METADATA_KEY, definition, target);
  };
}

/**
 * Returns the definition of the CLI command for the decorated class.
 *
 * @param constructor The constructor/class for the workspace function.
 * @returns The definition for the CLI command, or `undefined` if the class was not decorated.
 */
export function getCliCommandDefinition<D extends WorkspaceFunction<any>>(
  constructor: ImplementableFunctionDefinitionConstructor<D>,
): CliCommandDefinition<D> | undefined {
  return Reflect.getOwnMetadata(CLI_COMMAND_METADATA_KEY, constructor);
}
