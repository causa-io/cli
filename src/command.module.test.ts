import {
  ModuleRegistrationFunction,
  WorkspaceContext,
  WorkspaceFunction,
} from '@causa/workspace';
import { CliCommand } from './function-decorators/index.js';

export const outputObject = {
  workspace: undefined as WorkspaceContext | undefined,
};

@CliCommand({
  name: 'myFunction',
  outputFn: (output) => (outputObject.workspace = output),
})
export abstract class MyFunction extends WorkspaceFunction<WorkspaceContext> {}

export class MyFunctionImpl extends MyFunction {
  _call(context: WorkspaceContext): WorkspaceContext {
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
