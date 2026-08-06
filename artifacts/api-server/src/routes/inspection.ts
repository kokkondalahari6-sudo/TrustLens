import { Router, type IRouter } from "express";
import { db, auditLogsTable } from "@workspace/db";
import { AnalyzePayloadBody, AnalyzePayloadResponse } from "@workspace/api-zod";
import { authMiddleware, requireUserId, type AuthenticatedRequest } from "../middlewares/auth";
import { inspectPayload } from "../lib/inspection";

const router: IRouter = Router();

router.post("/inspect/analyze", authMiddleware, async (req: AuthenticatedRequest, res): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const parsed = AnalyzePayloadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const startedAt = performance.now();
    const analysis = await inspectPayload(parsed.data.payloadText);
    const processingTimeMs = Math.max(1, Math.round(performance.now() - startedAt));
    const [log] = await db.insert(auditLogsTable).values({
      userId,
      preview: parsed.data.payloadText.slice(0, 140),
      sanitizedText: analysis.sanitizedText,
      severity: analysis.severity,
      privacyScore: analysis.privacyScore,
      processingTimeMs,
      threats: analysis.threats,
      rationale: analysis.rationale,
      compliance: analysis.compliance,
    }).returning();
    res.json(AnalyzePayloadResponse.parse({ id: log.id, ...analysis, processingTimeMs, createdAt: log.createdAt }));
  } catch (error) {
    req.log.error({ error }, "Payload inspection failed");
    res.status(503).json({ error: "The inspection engine is unavailable. Please try again." });
  }
});

export default router;