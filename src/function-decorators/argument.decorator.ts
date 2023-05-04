import { WorkspaceFunction } from '@causa/workspace';
import 'reflect-metadata';
import { InvalidCliArgumentDefinition } from './errors.js';

/**
 * The reflect metadata key where the list of {@link CliArgumentDefinition}s for a command is stored.
 * Arguments are stored in the workspace function's constructor, just like the CLI command definition itself.
 */
const CLI_ARGUMENTS_METADATA_KEY = 'causa.CliArguments';

/**
 * The definition of a single input argument to a CLI command.
 */
export type CliArgumentDefinition = {
  /**
   * The name of the argument.
   * This will be passed to `commander` and can define `<required>`, `[optional]` and a final `variadic...` argument.
   */
  name: string;

  /**
   * The position of the argument in the list.
   * This should be between 0 and the number of arguments minus 1.
   */
  position: number;

  /**
   * The name of the decorated property in the workspace function.
   */
  propertyKey: string;

  /**
   * A description for the argument.
   */
  description?: string;
};

/**
 * Decorates the property of a workspace function that can be used as a CLI command, such that the property will be
 * populated from one of the command line's arguments.
 *
 * @param definition The definition of the argument.
 */
export function CliArgument(
  definition: Omit<CliArgumentDefinition, 'propertyKey'>,
) {
  return (target: WorkspaceFunction<any>, propertyKey: string) => {
    let args = Reflect.getOwnMetadata(
      CLI_ARGUMENTS_METADATA_KEY,
      target.constructor,
    ) as CliArgumentDefinition[] | undefined;
    if (args === undefined) {
      args = [];
      Reflect.defineMetadata(
        CLI_ARGUMENTS_METADATA_KEY,
        args,
        target.constructor,
      );
    }

    args.push({ propertyKey, ...definition });
  };
}

/**
 * Returns the list of arguments for a class which is a CLI command.
 * The returned list is validated and sorted such that arguments are in the order they should appear in the command.
 *
 * @param constructor The constructor/class for the decorated workspace function.
 * @returns The sorted arguments for the CLI command.
 */
export function getCliArgumentDefinitions(
  constructor: any,
): CliArgumentDefinition[] {
  let definitions: CliArgumentDefinition[] =
    Reflect.getOwnMetadata(CLI_ARGUMENTS_METADATA_KEY, constructor) ?? [];

  definitions = [...definitions].sort((d1, d2) => d1.position - d2.position);
  if (definitions.some((d, index) => d.position !== index)) {
    throw new InvalidCliArgumentDefinition(
      `The CLI arguments for the function should reference all positions between 0 and the number of arguments minus 1 exactly once.`,
    );
  }

  return definitions;
}
