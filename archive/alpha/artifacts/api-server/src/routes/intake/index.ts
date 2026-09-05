import { Router, type IRouter } from "express";
import {
  ClarifyRequestSchema,
  SuggestRequestSchema,
  runClarifyAgent,
  runSuggestAgent,
} from "../../lib/agents/intake";

const router: IRouter = Router();

router.post("/intake/clarify", async (req, res): Promise<void> => {
  const parsed = ClarifyRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const result = await runClarifyAgent(parsed.data);
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Clarify agent failed");
    res.status(500).json({ error: err instanceof Error ? err.message : "Unknown clarify error" });
  }
});

router.post("/intake/suggest", async (req, res): Promise<void> => {
  const parsed = SuggestRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const result = await runSuggestAgent(parsed.data);
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Suggest agent failed");
    res.status(500).json({ error: err instanceof Error ? err.message : "Unknown suggest error" });
  }
});

export default router;
