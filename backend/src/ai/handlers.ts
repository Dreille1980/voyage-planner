import { getOpenAIClient } from "./openaiClient";
import type { AiRequest } from "./schemas";

// Petit helper pour forcer JSON strict
function safeJsonParse<T>(raw: string): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error("Model returned non-JSON output");
  }
}

export async function handleAi(req: AiRequest) {
  const openai = getOpenAIClient();

  // Choisis un modèle. (Tu peux changer plus tard)
  const model = "gpt-4o-mini";

  if (req.action === "generate_checklist") {
    const prompt = `
You are generating a packing checklist for a trip. 
Return STRICT JSON only. No markdown. No extra text.

Trip profile:
${JSON.stringify(req.tripProfile)}

Required JSON format:
{
  "categories": [
    {
      "name": "Documents",
      "items": [
        { "label": "Passport", "assignedToAgeGroup": "adult|teen|kid|baby|null" }
      ]
    }
  ]
}

Rules:
- 5 to 10 categories max
- Each category 3 to 12 items
- Use short labels
- Avoid duplicates
- If travelers include kids/baby, add family/kid items
`;

    const r = await openai.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      // Important: on demande du JSON
      response_format: { type: "json_object" },
      temperature: 0.4,
    });

    const content = r.choices[0]?.message?.content ?? "{}";
    return safeJsonParse(content);
  }

  if (req.action === "destination_info") {
    const prompt = `
You are generating a short "Know before you go" summary for travel.
Return STRICT JSON only.

Destination: ${req.tripProfile.destination}

Required JSON format:
{
  "sections": [
    { "title": "Local rules", "bullets": ["...", "..."] },
    { "title": "Safety", "bullets": ["...", "..."] }
  ],
  "updatedAt": "ISO"
}

Rules:
- 5 to 7 sections
- 3 to 6 bullets per section
- Bullets must be short and practical
- Include practical tips: tipping, power plugs, transport, local etiquette
- updatedAt must be an ISO string (new Date().toISOString()) conceptually
`;

    const r = await openai.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const content = r.choices[0]?.message?.content ?? "{}";
    const obj = safeJsonParse<any>(content);

    // Force updatedAt if model forgot
    if (!obj.updatedAt) obj.updatedAt = new Date().toISOString();
    return obj;
  }

  if (req.action === "trip_qna") {
    const question = (req.question ?? "").trim();
    if (!question) {
      return { answer: "Please provide a question.", sources: [] };
    }

    const prompt = `
You answer travel questions. Keep it short, practical, and specific.
Return STRICT JSON only.

Trip profile:
${JSON.stringify(req.tripProfile)}

Question:
${question}

Required JSON format:
{
  "answer": "string",
  "sources": ["official tourism", "government", "airline", "generic"]
}

Rules:
- answer max 80 words
- sources are coarse labels (MVP), not URLs
`;

    const r = await openai.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.4,
    });

    const content = r.choices[0]?.message?.content ?? "{}";
    return safeJsonParse(content);
  }

  // fallback (normalement jamais atteint grâce à Zod)
  return { error: "Unknown action" };
}
