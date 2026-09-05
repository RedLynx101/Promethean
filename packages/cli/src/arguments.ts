export type OutputFormat = 'json' | 'text';

export class UsageError extends Error {}

export interface Arguments {
  command: string;
  positional: string[];
  format: OutputFormat;
  file?: string;
  out?: string;
  candidate?: string;
  force: boolean;
  help: boolean;
}

const valueOptions = new Set(['format', 'file', 'out', 'candidate']);
const flagOptions = new Set(['help', 'force']);

/** Parse only declared options. In particular, misspelled safety/output flags fail closed. */
export function parseArguments(argv: string[]): Arguments {
  const positional: string[] = [];
  const options = new Map<string, string | boolean>();
  let literal = false;
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!literal && token === '--') {
      literal = true;
      continue;
    }
    if (!literal && token.startsWith('-')) {
      const normalized = token === '-h' ? '--help' : token;
      if (!normalized.startsWith('--')) throw new UsageError(`Unknown option: ${token}`);
      const separator = normalized.indexOf('=');
      const name = normalized.slice(2, separator < 0 ? undefined : separator);
      if (options.has(name)) throw new UsageError(`Option --${name} was provided more than once.`);
      if (flagOptions.has(name)) {
        if (separator >= 0) throw new UsageError(`Option --${name} does not take a value.`);
        options.set(name, true);
      } else if (valueOptions.has(name)) {
        const value = separator >= 0 ? normalized.slice(separator + 1) : argv[++i];
        if (!value || (separator < 0 && value.startsWith('--'))) {
          throw new UsageError(`Option --${name} needs a value.`);
        }
        options.set(name, value);
      } else {
        throw new UsageError(`Unknown option: ${token}`);
      }
    } else {
      positional.push(token);
    }
  }
  const format = options.get('format') ?? 'json';
  if (format !== 'json' && format !== 'text') throw new UsageError('Format must be json or text.');
  return {
    command: positional.shift() ?? 'help',
    positional,
    format,
    file: options.get('file') as string | undefined,
    out: options.get('out') as string | undefined,
    candidate: options.get('candidate') as string | undefined,
    force: options.get('force') === true,
    help: options.get('help') === true,
  };
}

export function assertCommandOptions(
  args: Arguments,
  allowed: Array<'file' | 'candidate'> = [],
): void {
  for (const option of ['file', 'candidate'] as const) {
    if (args[option] !== undefined && !allowed.includes(option)) {
      throw new UsageError(`--${option} is not supported by ${args.command}.`);
    }
  }
  if (args.force && !args.out) throw new UsageError('--force requires --out.');
}

export function oneFileArgument(args: Arguments): string {
  assertCommandOptions(args, ['candidate']);
  if (args.positional.length !== 1)
    throw new UsageError(`${args.command} needs one JSON file path.`);
  return args.positional[0];
}
