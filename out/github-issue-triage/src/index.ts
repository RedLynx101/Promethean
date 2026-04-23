/**
 * Entry point — an Express HTTP receiver for GitHub issue webhooks.
 *
 * NOTE: scaffold-grade. HMAC verification is real per integration-github-api.md;
 * rate-limiting, auth rotation, and queue-based deferral of the actual
 * workflow run (to keep webhook responses <1s) are TODO(production).
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import http from "node:http";
import { runWorkflow } from "./workflow.js";

const PORT = Number(process.env.PORT ?? 3000);
const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET ?? "";

function verifyHmac(body: string, signatureHeader: string | undefined): boolean {
  if (!WEBHOOK_SECRET) {
    // eslint-disable-next-line no-console
    console.warn("[scaffold] GITHUB_WEBHOOK_SECRET not set — accepting without HMAC verify");
    return true;
  }
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex");
  const provided = signatureHeader.slice("sha256=".length);
  try {
    return (
      expected.length === provided.length &&
      timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(provided, "hex"))
    );
  } catch {
    return false;
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method !== "POST" || !req.url?.startsWith("/webhook")) {
    res.statusCode = 404;
    res.end();
    return;
  }

  const chunks: Buffer[] = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", async () => {
    const body = Buffer.concat(chunks).toString("utf8");
    if (!verifyHmac(body, req.headers["x-hub-signature-256"] as string | undefined)) {
      res.statusCode = 401;
      res.end(JSON.stringify({ error: "bad_signature" }));
      return;
    }

    const deliveryId =
      (req.headers["x-github-delivery"] as string | undefined) ?? null;

    // Return 200 fast; enqueue the run. For scaffold we run inline.
    try {
      const result = await runWorkflow(JSON.parse(body), {
        executionId: deliveryId ?? undefined,
      });
      res.statusCode = 200;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ status: "ok", ...result.flags }));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[scaffold] workflow error:", err);
      res.statusCode = 500;
      res.end(JSON.stringify({ error: (err as Error).message }));
    }
  });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[github-issue-triage] webhook receiver on :${PORT}`);
});
