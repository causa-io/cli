export {
  CliArgument,
  getCliArgumentDefinitions,
} from './argument.decorator.js';
export type { CliArgumentDefinition } from './argument.decorator.js';
export { CliCommand, getCliCommandDefinition } from './command.decorator.js';
export type {
  CliCommandDefinition,
  CliCommandOutputFunction,
  ParentCliCommandDefinition,
} from './command.decorator.js';
export * from './errors.js';
export { CliOption, getCliOptionDefinitions } from './option.decorator.js';
export type { CliOptionDefinition } from './option.decorator.js';
