import {
  ModuleRegistrationFunction,
  WorkspaceContext,
  WorkspaceFunction,
} from '@causa/workspace';
import { AllowMissing } from '@causa/workspace/validation';
import { IsString } from 'class-validator';
import { CliArgument, CliCommand } from './function-decorators/index.js';

export const outputObject = {
  workspace: undefined as WorkspaceContext | undefined,
  functionArg: undefined as string | undefined,
};

@CliCommand({
  name: 'myFunction',
  outputFn: (output) => (outputObject.workspace = output),
})
export abstract class MyFunction extends WorkspaceFunction<WorkspaceContext> {
  @AllowMissing()
  @IsString()
  @CliArgument({ name: '[arg]', position: 0 })
  arg?: string;
}

export class MyFunctionImpl extends MyFunction {
  _call(context: WorkspaceContext): WorkspaceContext {
    context.logger.info('👋');
    outputObject.functionArg = this.arg;
    return context;
  }

  _supports(): boolean {
    return true;
  }
}

const registerModule: ModuleRegistrationFunction = async (context) => {
  context.registerFunctionImplementations(MyFunctionImpl);
};

export default registerModule;
