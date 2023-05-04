import { pino } from 'pino';
import pretty, { PinoPretty } from 'pino-pretty';

/**
 * Creates a logger with the expected verbosity.
 * Everything is logged to `process.stderr` to avoid interfering with the real commands output.
 *
 * @param options Options when creating the logger.
 * @returns The logger.
 */
export function createLogger({
  verbose,
}: {
  /**
   * Whether the commands should output additional logs.
   */
  verbose?: boolean;
} = {}): pino.Logger {
  return pino(
    { level: verbose ? 'debug' : 'info' },
    // `pino-pretty` types seem to be a bit flaky, but the default export does contain the main function.
    (pretty as unknown as typeof PinoPretty)({
      ignore: 'pid,hostname',
      levelFirst: true,
      translateTime: 'SYS:HH:MM:ss.l',
      destination: process.stderr,
      // Simple trick to ensure that the level always take 5 characters and that messages are aligned.
      customLevels: { DEBUG: 20, 'INFO ': 30, 'WARN ': 40, ERROR: 50 },
    }),
  );
}
