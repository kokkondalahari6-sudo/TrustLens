import { Router, type IRouter } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { SendChatMessageBody, SendChatMessageResponse } from "@workspace/api-zod";
import { authMiddleware, requireUserId, type AuthenticatedRequest } from "../middlewares/auth";

const router: IRouter = Router();

function offlineGuidance(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("api key") || normalized.includes("token") || normalized.includes("secret") || normalized.includes("password")) {
    return "If a credential may have been exposed, revoke or rotate it immediately, check access logs for misuse, remove it from source control and logs, and replace it with a secret-manager reference. Never paste the live value into chat.";
  }
  if (normalized.includes("pii") || normalized.includes("personal") || normalized.includes("email") || normalized.includes("phone")) {
    return "PII is information that can identify or meaningfully describe a person, such as an email, phone number, address, location, or identifier. Minimize collection, redact before sharing, restrict access, and retain it only as long as needed.";
  }
  if (normalized.includes("redact") || normalized.includes("dlp") || normalized.includes("payload")) {
    return "A safe DLP workflow should detect sensitive patterns, explain why each signal matched, replace values with typed placeholders, preserve a before/after audit trail without storing raw secrets, and require review for high-risk findings.";
  }
  if (normalized.includes("compliance") || normalized.includes("gdpr") || normalized.includes("soc") || normalized.includes("hipaa") || normalized.includes("pci")) {
    return "Start with data classification and least privilege, then document collection purpose, retention, access controls, encryption, incident response, and evidence of regular reviews. Map the controls to the frameworks that apply to your organization.";
  }
  return "The AI assistant is temporarily at capacity, so I’m in offline guidance mode. For privacy work, avoid sharing live credentials, classify sensitive data before it moves, redact values before logging, and keep an auditable record of the decision.";
}

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
    const status = (error as { status?: number }).status;
    if (status === 429 || status === 500 || status === 503) {
      res.json({ reply: `${offlineGuidance(message)}\n\nAI analysis will resume automatically when provider capacity is available.` });
      return;
    }
    res.status(503).json({ error: "The security assistant is temporarily unavailable. Please try again." });
  }
});

export default router;