import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, auditLogsTable } from "@workspace/db";
import { GetAuditLogsQueryParams, GetAuditLogsResponse, GetAuditStatsResponse } from "@workspace/api-zod";
import { authMiddleware, requireUserId, type AuthenticatedRequest } from "../middlewares/auth";

const router: IRouter = Router();
const severities = new Set(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

router.get("/audit/logs", authMiddleware, async (req: AuthenticatedRequest, res): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const query = GetAuditLogsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const filters = [eq(auditLogsTable.userId, userId)];
  if (query.data.severity && query.data.severity !== "ALL") {
    filters.push(eq(auditLogsTable.severity, query.data.severity));
  }
  const rows = await db.select().from(auditLogsTable).where(and(...filters)).orderBy(desc(auditLogsTable.createdAt)).limit(50);
  res.json(GetAuditLogsResponse.parse(rows.map((row) => ({
    id: row.id,
    preview: row.preview,
    severity: row.severity,
    threatCount: row.threats.length,
    piiCount: row.threats.length,
    privacyScore: row.privacyScore,
    processingTimeMs: row.processingTimeMs,
    createdAt: row.createdAt,
  }))));
});

router.get("/audit/stats", authMiddleware, async (req: AuthenticatedRequest, res): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const rows = await db.select().from(auditLogsTable).where(eq(auditLogsTable.userId, userId)).orderBy(desc(auditLogsTable.createdAt)).limit(100);
  const severityCounts = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  let piiIntercepted = 0;
  let privacyTotal = 0;
  for (const row of rows) {
    if (severities.has(row.severity)) severityCounts[row.severity as keyof typeof severityCounts] += 1;
    piiIntercepted += row.threats.length;
    privacyTotal += row.privacyScore;
  }
  const riskScore = rows.length ? Math.round(rows.reduce((sum, row) => sum + (row.severity === "CRITICAL" ? 100 : row.severity === "HIGH" ? 78 : row.severity === "MEDIUM" ? 55 : 12), 0) / rows.length) : 0;
  const timeline = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const label = date.toLocaleDateString("en-US", { weekday: "short" });
    const dayRows = rows.filter((row) => row.createdAt.toDateString() === date.toDateString());
    return { label, scans: dayRows.length, risk: dayRows.length ? Math.round(dayRows.reduce((sum, row) => sum + (row.severity === "CRITICAL" ? 100 : row.severity === "HIGH" ? 78 : row.severity === "MEDIUM" ? 55 : 12), 0) / dayRows.length) : 0 };
  });
  res.json(GetAuditStatsResponse.parse({
    totalScans: rows.length,
    piiIntercepted,
    riskScore,
    averagePrivacyScore: rows.length ? Math.round(privacyTotal / rows.length) : 100,
    protectedPercent: rows.length ? Math.round((rows.filter((row) => row.privacyScore >= 80).length / rows.length) * 100) : 100,
    severityCounts,
    timeline,
  }));
});

export default router;