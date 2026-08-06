import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Threat } from "@workspace/api-zod";

type InspectionAnalysis = {
  sanitizedText: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  privacyScore: number;
  threats: Threat[];
  rationale: string;
  compliance: string[];
};

const threatSchema = `{
  "sanitizedText": "string with sensitive values replaced by [REDACTED_TYPE] placeholders",
  "severity": "LOW | MEDIUM | HIGH | CRITICAL",
  "privacyScore": "integer from 0 to 100 where 100 means no privacy risk",
  "threats": [
    { "type": "EMAIL | PHONE | CREDIT_CARD | API_KEY | JWT | SECRET | PASSWORD | IP_ADDRESS | BANK_ACCOUNT | PERSON | LOCATION | OTHER", "value": "placeholder only, never the original value", "severity": "LOW | MEDIUM | HIGH | CRITICAL", "confidence": "integer from 0 to 100", "rationale": "specific plain-language explanation of the pattern or rule that matched", "compliance": ["PCI-DSS", "GDPR Article 32", "SOC2", "ISO27001", "HIPAA"] }
  ],
  "rationale": "brief compliance and privacy rationale",
  "compliance": ["PCI-DSS", "GDPR Article 32", "SOC2", "ISO27001", "HIPAA"]
}`;

function parseModelJson(text: string): InspectionAnalysis {
  const normalized = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const parsed = JSON.parse(normalized) as Record<string, unknown>;
  const severity = parsed.severity;
  if (severity !== "LOW" && severity !== "MEDIUM" && severity !== "HIGH" && severity !== "CRITICAL") {
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
      (itemSeverity !== "LOW" && itemSeverity !== "MEDIUM" && itemSeverity !== "HIGH" && itemSeverity !== "CRITICAL")
    ) {
      throw new Error("Gemini returned an invalid threat");
    }
    return {
      type: threat.type,
      value: threat.value,
      severity: itemSeverity,
      confidence: typeof threat.confidence === "number" && Number.isFinite(threat.confidence)
        ? Math.max(0, Math.min(100, Math.round(threat.confidence)))
        : itemSeverity === "CRITICAL" ? 98 : itemSeverity === "HIGH" ? 94 : itemSeverity === "MEDIUM" ? 89 : 82,
      rationale: threat.rationale,
      compliance: Array.isArray(threat.compliance)
        ? (threat.compliance as unknown[]).filter((item): item is string => typeof item === "string").slice(0, 8)
        : [],
    } as Threat;
  });
  const privacyScore = typeof parsed.privacyScore === "number" && Number.isFinite(parsed.privacyScore)
    ? Math.max(0, Math.min(100, Math.round(parsed.privacyScore)))
    : Math.max(0, 100 - threats.reduce((total, threat) => total + (threat.severity === "CRITICAL" ? 28 : threat.severity === "HIGH" ? 18 : threat.severity === "MEDIUM" ? 8 : 3), 0));
  const compliance = Array.isArray(parsed.compliance)
    ? parsed.compliance.filter((item): item is string => typeof item === "string").slice(0, 8)
    : Array.from(new Set(threats.flatMap((threat) => threat.compliance)));
  return { sanitizedText: parsed.sanitizedText, severity, privacyScore, threats, rationale: parsed.rationale, compliance };
}

function luhnValid(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let alternate = false;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index]);
    if (alternate) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

function localSafetyInspection(payloadText: string): InspectionAnalysis {
  const candidates: Array<{ start: number; end: number; threat: Threat }> = [];
  const addMatches = (
    regex: RegExp,
    createThreat: (value: string) => Threat,
  ) => {
    for (const match of payloadText.matchAll(regex)) {
      const value = match[0];
      const start = match.index ?? -1;
      if (start >= 0) candidates.push({ start, end: start + value.length, threat: createThreat(value) });
    }
  };

  addMatches(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, (value) => ({
    type: "EMAIL",
    value: "[EMAIL]",
    severity: "MEDIUM",
    confidence: 99,
    rationale: "Matches a valid email address format with a local part, @ separator, and domain.",
    compliance: ["GDPR Article 32", "SOC2"],
  }));
  addMatches(/\b(?:\d[ -]*?){13,19}\b/g, (value) => ({
    type: "CREDIT_CARD",
    value: "[CREDIT_CARD]",
    severity: luhnValid(value) ? "CRITICAL" : "HIGH",
    confidence: luhnValid(value) ? 99 : 86,
    rationale: luhnValid(value) ? "Matches a payment-card pattern and passed the Luhn checksum." : "Matches a payment-card number pattern.",
    compliance: ["PCI-DSS", "GDPR Article 32"],
  }));
  addMatches(/\b(?:sk_(?:live|test)_[A-Za-z0-9_-]{8,}|AIza[A-Za-z0-9_-]{20,})\b/gi, (value) => ({
    type: "API_KEY",
    value: "[API_KEY]",
    severity: "CRITICAL",
    confidence: 98,
    rationale: "Matches a recognizable API-key prefix and high-entropy secret format.",
    compliance: ["SOC2", "ISO27001"],
  }));
  addMatches(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, () => ({
    type: "JWT",
    value: "[JWT]",
    severity: "CRITICAL",
    confidence: 97,
    rationale: "Matches the three-segment base64url structure used by JSON Web Tokens.",
    compliance: ["SOC2", "ISO27001"],
  }));
  addMatches(/(?:password|passwd|pwd)\s*[:=]\s*["']?[^"',\s}]+/gi, (value) => ({
    type: "PASSWORD",
    value: "[PASSWORD]",
    severity: "CRITICAL",
    confidence: 94,
    rationale: "A password field contains a non-empty credential value.",
    compliance: ["SOC2", "ISO27001", "GDPR Article 32"],
  }));
  addMatches(/(?<!\w)\+?\d[\d ()-]{7,}\d(?!\w)/g, (value) => ({
    type: "PHONE",
    value: "[PHONE]",
    severity: "HIGH",
    confidence: 88,
    rationale: "Matches a phone-number length and separator pattern.",
    compliance: ["GDPR Article 32", "HIPAA"],
  }));
  addMatches(/(?<!\w)(?:\d{1,3}\.){3}\d{1,3}(?!\w)/g, (value) => ({
    type: "IP_ADDRESS",
    value: "[IP_ADDRESS]",
    severity: "MEDIUM",
    confidence: 96,
    rationale: "Matches an IPv4 address pattern with four numeric octets.",
    compliance: ["GDPR Article 32", "SOC2"],
  }));

  const selected = candidates
    .sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start))
    .filter((candidate, index, all) => all.slice(0, index).every((previous) => candidate.start >= previous.end || candidate.end <= previous.start));
  let sanitizedText = payloadText;
  for (const candidate of [...selected].sort((a, b) => b.start - a.start)) {
    sanitizedText = `${sanitizedText.slice(0, candidate.start)}${candidate.threat.value}${sanitizedText.slice(candidate.end)}`;
  }
  const threats = selected.map((candidate) => candidate.threat);
  const privacyScore = Math.max(0, 100 - threats.reduce((total, threat) => total + (threat.severity === "CRITICAL" ? 28 : threat.severity === "HIGH" ? 18 : threat.severity === "MEDIUM" ? 8 : 3), 0));
  const severity = threats.some((threat) => threat.severity === "CRITICAL")
    ? "CRITICAL"
    : threats.some((threat) => threat.severity === "HIGH")
      ? "HIGH"
      : threats.some((threat) => threat.severity === "MEDIUM")
        ? "MEDIUM"
        : "LOW";
  const compliance = Array.from(new Set(threats.flatMap((threat) => threat.compliance)));
  return {
    sanitizedText,
    severity,
    privacyScore,
    threats,
    compliance,
    rationale: threats.length
      ? "Gemini was temporarily unavailable, so TrustLens used local pattern checks to provide an immediate explainable safety result. Re-run when AI analysis is available for broader contextual detection."
      : "No common sensitive-data patterns were found by the local safety checks. Gemini contextual analysis is recommended for broader coverage.",
  };
}

export async function inspectPayload(payloadText: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const client = new GoogleGenerativeAI(apiKey);
  const model = client.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: { responseMimeType: "application/json" },
  });
  const prompt = `You are TrustLens, a privacy DLP engine. Inspect the payload below for personally identifiable information, credentials, secrets, and risky data exposure. Return only valid JSON matching this exact shape:
${threatSchema}

Never repeat an original sensitive value in the response. Use placeholders in threat.value. Preserve non-sensitive text exactly where possible. For every detection, explain the concrete pattern or rule that caused it, assign a confidence percentage, and map it to relevant compliance frameworks. Treat API keys, bearer tokens, JWTs, private keys, passwords, and payment card numbers as CRITICAL. Treat phones and addresses as HIGH. Treat names, emails, IPs, and locations as MEDIUM unless context makes them higher. Treat no findings as LOW. Calculate privacyScore as a 0-100 score where 100 is safest.

PAYLOAD:
${payloadText}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return parseModelJson(text);
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (status === 404 || status === 429 || status === 500 || status === 503) {
      return localSafetyInspection(payloadText);
    }
    throw error;
  }
}