import express, { type ErrorRequestHandler } from 'express';
import { resolve } from 'node:path';
import { timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import {
  DomainError,
  recordSchema,
  searchEvidence,
  validatePackage,
  type WorkflowPatch,
} from '@promethean/core';
import { Store, WorkflowService } from '@promethean/runtime';

const createSchema = z
  .object({
    description: z.string().trim().min(1).max(12000),
    name: z.string().trim().min(1).max(120).optional(),
    exampleId: z.string().optional(),
    mode: z.enum(['local', 'live']).optional(),
  })
  .strict();
const runSchema = z
  .object({
    candidateId: z.string().optional(),
    input: recordSchema.optional(),
    mode: z.enum(['local', 'live']).optional(),
    idempotencyKey: z.string().min(1).max(160),
  })
  .strict();
const approvalSchema = z
  .object({ decision: z.enum(['approve', 'deny']), expectedRevision: z.number().int().positive() })
  .strict();
const retrySchema = z.object({ expectedRevision: z.number().int().positive() }).strict();
const compareSchema = z
  .object({
    candidateIds: z.array(z.string()).min(2).max(3).optional(),
    mode: z.enum(['local', 'live']).optional(),
  })
  .strict();
function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new DomainError(
      `Invalid request: ${result.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .slice(0, 3)
        .join('; ')}`,
      400,
    );
  return result.data;
}
export function createApp(
  options: {
    service?: WorkflowService;
    dataDir?: string;
    accessToken?: string;
    bootstrap?: boolean;
  } = {},
) {
  const service =
    options.service ??
    new WorkflowService(
      new Store(
        resolve(
          options.dataDir ?? process.env.PROMETHEAN_DATA_DIR ?? 'work/data',
          'promethean.sqlite',
        ),
        Number(process.env.PROMETHEAN_BUDGET_USD ?? '5'),
      ),
      { bootstrap: options.bootstrap },
    );
  const accessToken = options.accessToken ?? process.env.PROMETHEAN_ACCESS_TOKEN;
  const app = express();
  app.disable('x-powered-by');
  app.locals.service = service;
  app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (accessToken) {
      const supplied = Buffer.from(req.get('authorization')?.replace(/^Bearer /, '') ?? ''),
        wanted = Buffer.from(accessToken);
      if (supplied.length !== wanted.length || !timingSafeEqual(supplied, wanted)) {
        res.status(401).json({ error: 'A workspace access token is required.' });
        return;
      }
    } else {
      let hostname = '';
      try {
        hostname = new URL(`http://${req.get('host') ?? ''}`).hostname;
      } catch {
        /* reject below */
      }
      if (!['localhost', '127.0.0.1', '[::1]'].includes(hostname)) {
        res.status(403).json({ error: 'The local workspace accepts loopback hosts only.' });
        return;
      }
    }
    const origin = req.get('origin');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && origin) {
      let same = false;
      try {
        same = new URL(origin).host === req.get('host');
      } catch {
        /* reject */
      }
      if (!same) {
        res.status(403).json({ error: 'Cross-origin mutations are not allowed.' });
        return;
      }
    }
    next();
  });
  app.use(express.json({ limit: '128kb', strict: true }));
  const mutationWindows = new Map<string, { start: number; count: number }>();
  app.use('/api', (req, res, next) => {
    if (req.method === 'GET') {
      next();
      return;
    }
    const key = req.ip ?? 'local',
      now = Date.now();
    let state = mutationWindows.get(key);
    if (!state || now - state.start > 60000) {
      state = { start: now, count: 0 };
      mutationWindows.set(key, state);
    }
    if (++state.count > 90) {
      res.status(429).json({ error: 'Too many workspace changes. Wait a minute before retrying.' });
      return;
    }
    next();
  });
  app.get('/api/health', (_req, res) => res.json({ status: 'ok', version: '2.0.0' }));
  app.get('/api/workspace', (_req, res) => res.json(service.workspace()));
  app.post('/api/workflows', async (req, res) => {
    const body = parse(createSchema, req.body);
    res.status(201).json(await service.create(body.description, body));
  });
  app.get('/api/workflows/:id', (req, res) => res.json(service.detail(String(req.params.id))));
  app.patch('/api/workflows/:id', (req, res) =>
    res.json(service.patch(String(req.params.id), req.body as WorkflowPatch)),
  );
  app.post('/api/workflows/:id/run', (req, res) =>
    res.status(202).json(service.queueRun(String(req.params.id), parse(runSchema, req.body))),
  );
  app.get('/api/runs/:id', (req, res) => res.json(service.store.getRun(String(req.params.id))));
  app.post('/api/runs/:id/approve', (req, res) => {
    const body = parse(approvalSchema, req.body);
    res.json(service.approve(String(req.params.id), body.decision, body.expectedRevision));
  });
  app.post('/api/runs/:id/cancel', (req, res) => res.json(service.cancel(String(req.params.id))));
  app.post('/api/runs/:id/retry', (req, res) =>
    res
      .status(202)
      .json(service.retry(String(req.params.id), parse(retrySchema, req.body).expectedRevision)),
  );
  let comparing = false;
  app.post('/api/workflows/:id/compare', async (req, res) => {
    if (comparing)
      throw new DomainError('A comparison is already running. Wait for it to finish.', 409);
    const body = parse(compareSchema, req.body ?? {});
    comparing = true;
    try {
      res.json(await service.compare(String(req.params.id), body.candidateIds, body.mode));
    } finally {
      comparing = false;
    }
  });
  app.get('/api/workflows/:id/export', (req, res) =>
    res.json(service.export(String(req.params.id))),
  );
  app.post('/api/packages/validate', (req, res) => res.json(validatePackage(req.body?.package)));
  app.post('/api/packages/import', (req, res) =>
    res.status(201).json(service.import(req.body?.package)),
  );
  app.get('/api/evidence', (req, res) =>
    res.json(searchEvidence(String(req.query.q ?? '').slice(0, 500))),
  );
  app.get('/api/usage', (_req, res) =>
    res.json({ budget: service.store.budget(), ledger: service.store.usageRecords() }),
  );
  app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found.' }));
  const onError: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
    if (error instanceof DomainError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    const code = error && typeof error === 'object' && 'type' in error ? error.type : '';
    if (code === 'entity.too.large') {
      res.status(413).json({ error: 'The request exceeds 128 KB.' });
      return;
    }
    if (error instanceof SyntaxError) {
      res.status(400).json({ error: 'The request body is not valid JSON.' });
      return;
    }
    res.status(500).json({ error: 'The workspace operation failed unexpectedly.' });
  };
  app.use(onError);
  return app;
}
