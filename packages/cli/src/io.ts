import { open, mkdir, readFile, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { UsageError } from './arguments.js';

// Larger than an API request to accommodate complete portable fixture packages,
// but bounded before JSON parsing and execution.
const MAX_JSON_BYTES = 2 * 1024 * 1024;
const MAX_DESCRIPTION_BYTES = 48 * 1024;

export async function readBoundedText(
  path: string,
  cwd: string,
  maxBytes = MAX_DESCRIPTION_BYTES,
): Promise<string> {
  const absolute = resolve(cwd, path);
  const info = await stat(absolute);
  if (!info.isFile()) throw new UsageError('Input must be a regular file.');
  if (info.size > maxBytes) throw new UsageError(`Input file exceeds the ${maxBytes}-byte limit.`);
  const value = await readFile(absolute, 'utf8');
  if (Buffer.byteLength(value, 'utf8') > maxBytes)
    throw new UsageError('Input file changed beyond the size limit.');
  return value.replace(/^\uFEFF/, '');
}

export async function readJson(path: string, cwd: string): Promise<unknown> {
  const source = await readBoundedText(path, cwd, MAX_JSON_BYTES);
  try {
    return JSON.parse(source) as unknown;
  } catch {
    throw new UsageError('Input is not valid JSON.');
  }
}

export async function saveOutput(
  path: string,
  cwd: string,
  content: string,
  force: boolean,
): Promise<string> {
  const absolute = resolve(cwd, path);
  await mkdir(dirname(absolute), { recursive: true });
  const handle = await open(absolute, force ? 'w' : 'wx', 0o600);
  try {
    await handle.writeFile(content, 'utf8');
  } finally {
    await handle.close();
  }
  return absolute;
}

export function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String(error.code);
    if (code === 'EEXIST')
      return 'Output file already exists. Choose another path or explicitly use --force.';
    if (code === 'ENOENT') return 'Input path does not exist.';
    if (code === 'EACCES' || code === 'EPERM')
      return 'The requested file operation is not permitted.';
  }
  return error instanceof Error ? error.message : 'Unexpected CLI error.';
}
