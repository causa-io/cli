import { ParentCliCommandDefinition } from '../function-decorators/index.js';

/**
 * An error thrown when two definitions exists of a parent command with the same name.
 */
export class DuplicateParentCommandDefinitionError extends Error {
  constructor(readonly definition: ParentCliCommandDefinition) {
    super(
      `Parent command definition '${definition.name}' already exists in the CLI. This is an issue with the loaded modules.`,
    );
  }
}

/**
 * An error thrown when an unexpected number of arguments is processed from the commander's action.
 */
export class UnexpectedWorkspaceFunctionCommandArgumentsError extends Error {
  constructor(
    readonly commandArgs: any[],
    readonly argumentsMapping: string[],
  ) {
    super(
      `Unexpected number of arguments received from the command ('${commandArgs}') against the mapping '${argumentsMapping}'. This is an internal error.`,
    );
  }
}
