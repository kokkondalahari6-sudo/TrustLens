import { Router, type IRouter } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { SendChatMessageBody, SendChatMessageResponse } from "@workspace/api-zod";
import { authMiddleware, requireUserId, type AuthenticatedRequest } from "../middlewares/auth";

const router: IRouter = Router();

router.post("/chat", authMiddleware, async (req: AuthenticatedRequest, res): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const parsed = SendChatMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const message = parsed.data.message.trim();
  if (!message) {
    res.status(400).json({ error: "Message cannot be empty" });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "The security assistant is not configured yet." });
    return;
  }

  try {
    const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: { maxOutputTokens: 8192 },
    });
    const history = (parsed.data.history ?? []).slice(-20).map((entry) => ({
      role: entry.role === "assistant" ? "model" as const : "user" as const,
      parts: [{ text: entry.content.slice(0, 4000) }],
    }));
    const prompt = `You are TrustLens Assistant, a concise privacy and security copilot inside a protected data-inspection workspace.

Rules:
- Help users understand privacy risks, sensitive-data detection, redaction, DLP, compliance, and secure engineering.
- Never ask for or encourage sharing passwords, API keys, tokens, private keys, full payment-card numbers, or other live secrets.
- If a user includes a secret, tell them to revoke or rotate it and do not repeat it.
- Do not claim to have inspected a payload unless the user provides the inspection result in the conversation.
- Give practical, plain-language answers with short headings or bullets when useful.
- Stay focused on privacy and security; politely redirect unrelated questions.

User message:
${message}`;

    const result = await model.generateContent({
      contents: [...history, { role: "user", parts: [{ text: prompt }] }],
    });
    const reply = result.response.text().trim();
    if (!reply) throw new Error("Gemini returned an empty response");
    res.json(SendChatMessageResponse.parse({ reply }));
  } catch (error) {
    req.log.error({ error }, "Chat assistant request failed");
    res.status(503).json({ error: "The security assistant is temporarily unavailable. Please try again." });
  }
});

export default router;