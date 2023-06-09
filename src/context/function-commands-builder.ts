import { WorkspaceFunction } from '@causa/workspace';
import {
  ImplementableFunctionArguments,
  ImplementableFunctionDefinitionConstructor,
} from '@causa/workspace/function-registry';
import { Command } from 'commander';
import {
  CliCommandDefinition,
  CliCommandOutputFunction,
  ParentCliCommandDefinition,
  getCliArgumentDefinitions,
  getCliCommandDefinition,
  getCliOptionDefinitions,
} from '../function-decorators/index.js';
import {
  DuplicateParentCommandDefinitionError,
  UnexpectedWorkspaceFunctionCommandArgumentsError,
} from './errors.js';

/**
 * A function that handles a call to a workspace function to be run as a command.
 * This is meant to be `CliContext.runWorkspaceFunctionAsAction`.
 */
export type WorkspaceFunctionCommandRunner = (
  definition: ImplementableFunctionDefinitionConstructor<
    WorkspaceFunction<any>
  >,
  args: ImplementableFunctionArguments<WorkspaceFunction<any>>,
  outputFn: CliCommandOutputFunction<WorkspaceFunction<any>> | undefined,
) => Promise<void>;

/**
 * A command grouping subcommands together.
 */
type ParentCommand = {
  /**
   * The definition of the parent command, to ensure that it is unique.
   * For the root program this is `undefined`.
   */
  definition: ParentCliCommandDefinition | undefined;

  /**
   * The commander's {@link Command}.
   */
  command: Command;

  /**
   * Subcommands that are also parent commands, in case the hierarchy goes deeper.
   */
  children: Record<string, ParentCommand>;
};

/**
 * A utility class iterating over {@link WorkspaceFunction}s, and registering the ones decorated with the `CliCommand`
 * decorator as commands in the CLI.
 */
export class WorkspaceFunctionCommandsBuilder {
  /**
   * The root command, instantiated from the {@link Command} passed in the constructor.
   */
  private readonly rootCommand: ParentCommand;

  /**
   * Creates a new {@link WorkspaceFunctionCommandsBuilder}.
   *
   * @param program The root commander's {@link Command}.
   * @param commandRunner The function that will run a {@link WorkspaceFunction} as a command.
   */
  constructor(
    program: Command,
    readonly commandRunner: WorkspaceFunctionCommandRunner,
  ) {
    this.rootCommand = {
      children: {},
      command: program,
      definition: undefined,
    };
  }

  /**
   * Constructs commander's {@link Command} definitions from workspace function definitions.
   *
   * @param definitions The list of {@link ImplementableFunctionDefinitionConstructor} to register as (potential) commands.
   */
  buildCommands(
    definitions: ImplementableFunctionDefinitionConstructor<
      WorkspaceFunction<any>
    >[],
  ) {
    definitions.forEach((definition) => this.buildCommand(definition));
  }

  /**
   * Constructs commander's {@link Command} definitions from a workspace function definition.
   *
   * @param definition The {@link ImplementableFunctionDefinitionConstructor} to register as a (potential) command.
   */
  buildCommand(
    definition: ImplementableFunctionDefinitionConstructor<
      WorkspaceFunction<any>
    >,
  ) {
    const commandDefinition = getCliCommandDefinition(definition);
    if (!commandDefinition) {
      return;
    }

    const { command: parentCommand } = this.findOrCreateParentCommand(
      commandDefinition.parent,
    );
    const command = this.createCommandForDefinition(
      parentCommand,
      commandDefinition,
    );

    const argumentsMapping = this.addCommandArgumentsForFunction(
      command,
      definition,
    );
    const optionsMapping = this.addCommandOptionsForFunction(
      command,
      definition,
    );

    command.action(async (...args: any[]) => {
      const fnArgs = this.buildFunctionArguments(
        args,
        argumentsMapping,
        optionsMapping,
      );

      await this.commandRunner(definition, fnArgs, commandDefinition.outputFn);
    });
  }

  /**
   * Creates a commander {@link Command} without its arguments and options.
   * This can be used for actual workspace function commands, or for parent commands grouping subcommands together.
   *
   * @param parentCommand The parent command for the command to create.
   * @param definition The definition, which can be a parent command (grouping subcommands together) or a "final"
   *   command.
   * @returns The created command.
   */
  private createCommandForDefinition(
    parentCommand: Command,
    definition: CliCommandDefinition<any> | ParentCliCommandDefinition,
  ): Command {
    let command = parentCommand.command(definition.name);

    if (definition.description) {
      command = command.description(definition.description);
    }

    if (definition.summary) {
      command = command.summary(definition.summary);
    }

    if (definition.aliases) {
      command = command.aliases(definition.aliases);
    }

    return command;
  }

  /**
   * Finds or create a {@link ParentCommand} in the hierarchy of commands.
   * Ensures that {@link ParentCliCommandDefinition}s do not lead to duplicate (parent) command names in the CLI.
   *
   * @param definition The definition for which the parent should be found, or `undefined` if the command has no parent.
   *   When `undefined`, the {@link WorkspaceFunctionCommandsBuilder.rootCommand} is returned.
   * @returns The {@link ParentCommand}.
   */
  private findOrCreateParentCommand(
    definition: ParentCliCommandDefinition | undefined,
  ): ParentCommand {
    if (!definition) {
      return this.rootCommand;
    }

    const { children, command } = this.findOrCreateParentCommand(
      definition.parent,
    );

    if (definition.name in children) {
      const existingCommand = children[definition.name];
      if (existingCommand.definition !== definition) {
        throw new DuplicateParentCommandDefinitionError(definition);
      }
      return existingCommand;
    }

    const newCommand: ParentCommand = {
      definition,
      children: {},
      command: this.createCommandForDefinition(command, definition),
    };
    children[definition.name] = newCommand;
    return newCommand;
  }

  /**
   * Defines the arguments for an already-created {@link Command}.
   * The returned list of properties can be used during a call to the command to build the function object from the
   * commander action's arguments.
   *
   * @param command The command for which arguments should be defined.
   * @param definition The definition of the workspace function from which arguments should be defined.
   * @returns The ordered list of properties in the {@link WorkspaceFunction} corresponding to the arguments.
   */
  private addCommandArgumentsForFunction(
    command: Command,
    definition: ImplementableFunctionDefinitionConstructor<
      WorkspaceFunction<any>
    >,
  ): string[] {
    const argumentDefinitions = getCliArgumentDefinitions(definition);
    const argumentsMapping = argumentDefinitions.map((d) => d.propertyKey);

    argumentDefinitions.forEach((argumentDefinition) => {
      command.argument(argumentDefinition.name, argumentDefinition.description);
    });

    return argumentsMapping;
  }

  /**
   * Defines the options for an already-created {@link Command}.
   * The returned dictionary can be used during a call to the command to build the function object from the commander
   * action's options
   *
   * @param command The command for which options should be defined.
   * @param definition The definition of the workspace function from which options should be defined.
   * @returns A dictionary mapping option names (found in the commander action's options) to properties in the
   *   {@link WorkspaceFunction} object.
   */
  private addCommandOptionsForFunction(
    command: Command,
    definition: ImplementableFunctionDefinitionConstructor<
      WorkspaceFunction<any>
    >,
  ): Record<string, string> {
    const optionsMapping: Record<string, string> = {};

    getCliOptionDefinitions(definition).forEach((optionDefinition) => {
      const option = command.createOption(
        optionDefinition.flags,
        optionDefinition.description,
      );

      command.addOption(option);
      optionsMapping[option.attributeName()] = optionDefinition.propertyKey;
    });

    return optionsMapping;
  }

  /**
   * Transforms a command's arguments and options from commander to an arguments object used to call a workspace
   * function.
   *
   * @param commandArgs The arguments passed by the commander action.
   * @param argumentsMapping The mapping of command arguments to function properties.
   * @param optionsMapping The mapping of command options to function properties.
   * @returns An object that can be used to call the {@link WorkspaceFunction}.
   */
  private buildFunctionArguments(
    commandArgs: any[],
    argumentsMapping: string[],
    optionsMapping: Record<string, string>,
  ): any {
    if (commandArgs.length !== argumentsMapping.length + 2) {
      throw new UnexpectedWorkspaceFunctionCommandArgumentsError(
        commandArgs,
        argumentsMapping,
      );
    }

    const [options] = commandArgs.splice(-2);

    const args: Record<string, any> = {};

    argumentsMapping.forEach(
      (name, index) => (args[name] = commandArgs[index]),
    );

    Object.entries(optionsMapping).forEach(
      ([optionName, argName]) => (args[argName] = options[optionName]),
    );

    return args;
  }
}
