import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Threat } from "@workspace/api-zod";

const threatSchema = `{
  "sanitizedText": "string with sensitive values replaced by [REDACTED_TYPE] placeholders",
  "severity": "LOW | MEDIUM | HIGH",
  "threats": [
    { "type": "EMAIL | PHONE | CREDIT_CARD | API_KEY | SECRET | PERSON | LOCATION | OTHER", "value": "placeholder only, never the original value", "severity": "LOW | MEDIUM | HIGH", "rationale": "short explanation" }
  ],
  "rationale": "brief compliance and privacy rationale"
}`;

function parseModelJson(text: string): {
  sanitizedText: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  threats: Threat[];
  rationale: string;
} {
  const normalized = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const parsed = JSON.parse(normalized) as Record<string, unknown>;
  const severity = parsed.severity;
  if (severity !== "LOW" && severity !== "MEDIUM" && severity !== "HIGH") {
    throw new Error("Gemini returned an invalid severity");
  }
  if (typeof parsed.sanitizedText !== "string" || typeof parsed.rationale !== "string" || !Array.isArray(parsed.threats)) {
    throw new Error("Gemini returned an incomplete inspection");
  }
  const threats = parsed.threats.map((item) => {
    const threat = item as Record<string, unknown>;
    const itemSeverity = threat.severity;
    if (
      typeof threat.type !== "string" ||
      typeof threat.value !== "string" ||
      typeof threat.rationale !== "string" ||
      (itemSeverity !== "LOW" && itemSeverity !== "MEDIUM" && itemSeverity !== "HIGH")
    ) {
      throw new Error("Gemini returned an invalid threat");
    }
    return {
      type: threat.type,
      value: threat.value,
      severity: itemSeverity,
      rationale: threat.rationale,
    } as Threat;
  });
  return { sanitizedText: parsed.sanitizedText, severity, threats, rationale: parsed.rationale };
}

export async function inspectPayload(payloadText: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const client = new GoogleGenerativeAI(apiKey);
  const model = client.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: { responseMimeType: "application/json" },
  });
  const prompt = `You are TrustLens, a privacy DLP engine. Inspect the payload below for personally identifiable information, credentials, secrets, and risky data exposure. Return only valid JSON matching this exact shape:
${threatSchema}

Never repeat an original sensitive value in the response. Use placeholders in threat.value. Preserve non-sensitive text exactly where possible. Treat API keys, bearer tokens, private keys, and payment card numbers as HIGH severity. Treat names, emails, phones, and locations as MEDIUM unless context makes them higher. Treat no findings as LOW.

PAYLOAD:
${payloadText}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return parseModelJson(text);
}