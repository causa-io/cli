/**
 * An error thrown when the definition of a CLI command made using `CliArgument` decorator is invalid.
 * The most probably cause is an incorrect definition of the `position` properties for the arguments.
 */
export class InvalidCliArgumentDefinition extends Error {}
