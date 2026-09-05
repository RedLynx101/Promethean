import { createApp } from './app.js';
import type { WorkflowService } from '@promethean/runtime';

const host = process.env.PROMETHEAN_HOST ?? '127.0.0.1',
  port = Number(process.env.PROMETHEAN_API_PORT ?? '4318');
if (!['127.0.0.1', 'localhost', '::1'].includes(host) && !process.env.PROMETHEAN_ACCESS_TOKEN)
  throw new Error('Remote binding requires PROMETHEAN_ACCESS_TOKEN.');
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error('PROMETHEAN_API_PORT is invalid.');
const app = createApp();
const server = app.listen(port, host, () =>
  process.stdout.write(`Promethean API 2.0.0 listening at http://${host}:${port}\n`),
);
async function shutdown(): Promise<void> {
  server.close();
  await (app.locals.service as WorkflowService).close();
}
process.once('SIGINT', () => {
  void shutdown();
});
process.once('SIGTERM', () => {
  void shutdown();
});
