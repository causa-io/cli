import { WorkspaceFunction } from '@causa/workspace';
import 'reflect-metadata';

/**
 * The reflect metadata key where the list of {@link CliOptionDefinition}s for a command is stored.
 * Options are stored in the workspace function's constructor, just like the CLI command definition itself.
 */
const CLI_OPTIONS_METADATA_KEY = 'causa.CliOptions';

/**
 * The definition of a single option for a CLI command.
 */
export type CliOptionDefinition = {
  /**
   * The flags for the option.
   * This will be passed to `commander` and can define several flags, e.g. `-o, --option <optionValue>'.
   */
  flags: string;

  /**
   * The name of the decorated property in the workspace function.
   */
  propertyKey: string;

  /**
   * A description for the option.
   */
  description?: string;
};

/**
 * Decorates the property of a workspace function that can be used as a CLI command, such that the property will be
 * populated from one of the command line's options.
 *
 * @param definition The definition of the option.
 */
export function CliOption(
  definition: Omit<CliOptionDefinition, 'propertyKey'>,
) {
  return (target: WorkspaceFunction<any>, propertyKey: string) => {
    let options = Reflect.getOwnMetadata(
      CLI_OPTIONS_METADATA_KEY,
      target.constructor,
    ) as CliOptionDefinition[] | undefined;
    if (!options) {
      options = [];
      Reflect.defineMetadata(
        CLI_OPTIONS_METADATA_KEY,
        options,
        target.constructor,
      );
    }

    options.push({ propertyKey, ...definition });
  };
}

/**
 * Returns the list of options for a class which is a CLI command.
 *
 * @param constructor The constructor/class for the decorated workspace function.
 * @returns The options for the CLI command.
 */
export function getCliOptionDefinitions(
  constructor: any,
): CliOptionDefinition[] {
  return Reflect.getOwnMetadata(CLI_OPTIONS_METADATA_KEY, constructor) ?? [];
}
