import { WorkspaceContext, WorkspaceFunction } from '@causa/workspace';
import {
  ImplementableFunctionArguments,
  ImplementableFunctionDefinitionConstructor,
} from '@causa/workspace/function-registry';
import { Command } from 'commander';
import { CliCommandOutputFunction } from '../function-decorators/index.js';
import { WorkspaceFunctionCommandsBuilder } from './function-commands-builder.js';

/**
 * The context describing an execution of the CLI, coupling a {@link WorkspaceContext} with a commander {@link Command}.
 */
export class CliContext {
  constructor(readonly program: Command, readonly workspace: WorkspaceContext) {
    this.buildCommandsFromFunctions();
  }

  /**
   * Defines commander {@link Command}s from the functions registered in the workspace context.
   */
  private buildCommandsFromFunctions() {
    const functionDefinitions = this.workspace.getFunctionDefinitions();
    const build = new WorkspaceFunctionCommandsBuilder(
      this.program,
      (definition, args, outputFn) =>
        this.runWorkspaceFunctionAsAction(definition, args, { outputFn }),
    );
    build.buildCommands(functionDefinitions);
  }

  /**
   * Runs the given {@link WorkspaceFunction} as the main action for a CLI command.
   * The arguments are validated and transformed before calling the implementation.
   * Optionally, the output of the function can be processed (e.g. logged to stdout).
   *
   * @param definition The definition of the {@link WorkspaceFunction} to call.
   * @param args The arguments for the workspace function.
   * @param options Options when running the function.
   */
  async runWorkspaceFunctionAsAction<D extends WorkspaceFunction<any>>(
    definition: ImplementableFunctionDefinitionConstructor<D>,
    args: ImplementableFunctionArguments<D>,
    options: {
      /**
       * A function processing the output of the workspace function, usually for logging to the console.
       */
      outputFn?: CliCommandOutputFunction<D>;
    } = {},
  ): Promise<void> {
    await this.wrapAction(async () => {
      await this.workspace.validateFunctionArguments(definition, args);

      const output = await this.workspace.call(definition, args);

      if (options.outputFn) {
        await options.outputFn(output);
      }
    });
  }

  /**
   * Wraps any function meant to be run as the action for a CLI command.
   * This catches errors and displays them using the context's logger.
   *
   * @param fn The function to wrap.
   */
  async wrapAction(fn: () => Promise<void>): Promise<void> {
    try {
      await fn();
    } catch (error: any) {
      const message = error.message ?? error;
      this.workspace.logger.error(`❌ ${message}`);
      process.exitCode = 1;
    }
  }
}
