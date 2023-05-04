import {
  ModuleRegistrationFunction,
  WorkspaceFunction,
} from '@causa/workspace';
import { IsString } from 'class-validator';
import { CliArgument, CliCommand } from './function-decorators/index.js';

export const outputObject = {
  outputValue: undefined as undefined | string,
};

@CliCommand({
  name: 'myFunction',
  outputFn: (output) => (outputObject.outputValue = output),
})
export abstract class MyFunction extends WorkspaceFunction<string> {
  @CliArgument({ name: '<arg>', position: 0 })
  @IsString()
  readonly arg!: string;
}

export class MyFunctionImpl extends MyFunction {
  _call(): string {
    return this.arg;
  }

  _supports(): boolean {
    return true;
  }
}

const registerModule: ModuleRegistrationFunction = async (context) => {
  context.registerFunctionImplementations(MyFunctionImpl);
};

export default registerModule;
