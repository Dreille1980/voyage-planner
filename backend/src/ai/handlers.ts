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

// Helper pour calculer une deadline intelligente (not used currently - AI calculates deadlines)
function calculateDeadline(startDate: string | null, daysBeforeDeparture: number): string | null {
  if (!startDate) return null;
  
  try {
    const departure = new Date(startDate);
    const deadline = new Date(departure);
    deadline.setDate(deadline.getDate() - daysBeforeDeparture);
    return deadline.toISOString().split('T')[0]; // Format YYYY-MM-DD
  } catch {
    return null;
  }
}

export async function handleAi(req: AiRequest) {
  const openai = getOpenAIClient();

  // Choisis un modèle. (Tu peux changer plus tard)
  const model = "gpt-4o-mini";

  if (req.action === "generate_checklist") {
    const checklistType = req.checklistType || "bagage_soute"; // Default fallback
    
    let prompt = "";
    let specificInstructions = "";

    // Générer des deadlines intelligentes pour les préparatifs
    const hasStartDate = !!req.tripProfile.startDate;
    
    if (checklistType === "preparatifs") {
      specificInstructions = `
Generate a travel preparation checklist with DEADLINES.
${hasStartDate ? `Trip starts on: ${req.tripProfile.startDate}` : "No start date provided - use relative deadlines"}

Include items like:
- Passport verification/renewal (deadline: 6 months before if needed, or 2 months before departure)
- Visa application (deadline varies by destination, typically 2-3 months before)
- Vaccinations (deadline: 1-2 months before for effectiveness)
- Travel insurance (deadline: 2-4 weeks before)
- Flight/accommodation booking (deadline: varies, suggest 1-2 months before)
- Currency exchange (deadline: 1-2 weeks before)
- Pet/plant care arrangements (deadline: 2-3 weeks before)
- Work notifications (deadline: 1 month before)
- Medical checkup if needed (deadline: 1 month before)

IMPORTANT: For each item, calculate an intelligent deadline based on:
1. The start date if provided (${req.tripProfile.startDate || 'not provided'})
2. The destination (${req.tripProfile.destination}) - some countries require specific lead times
3. The type of task and typical processing times

Return deadline as ISO date string (YYYY-MM-DD) or null if not applicable.
`;
    } else if (checklistType === "bagage_soute") {
      specificInstructions = `
Generate a checked luggage packing list.
Include categories like:
- Clothing (based on destination climate and trip duration)
- Shoes (casual, formal, sports)
- Toiletries (large bottles, sunscreen)
- Beach/sports equipment if relevant
- Extra items (books, gifts, etc.)

NO deadlines needed for packing items.
Adapt to: destination (${req.tripProfile.destination}), travelers (${req.tripProfile.travelers?.length || 1}), trip style.
`;
    } else if (checklistType === "bagage_main") {
      specificInstructions = `
Generate a carry-on / hand luggage packing list.
Include categories like:
- Travel documents (passport, tickets, insurance)
- Electronics (phone, charger, tablet, headphones)
- Medications and first-aid
- Valuables (wallet, jewelry, keys)
- Comfort items (neck pillow, snacks, book)
- Change of clothes (in case luggage is lost)

NO deadlines needed for packing items.
Keep it compact - only essential items for carry-on.
`;
    }

    prompt = `
You are generating a ${checklistType} checklist for a trip.
Return STRICT JSON only. No markdown. No extra text.

Trip profile:
${JSON.stringify(req.tripProfile)}

${specificInstructions}

Required JSON format:
{
  "categories": [
    {
      "name": "Category Name",
      "items": [
        { 
          "label": "Item description", 
          "assignedToAgeGroup": "adult|teen|kid|baby|null",
          "deadline": "YYYY-MM-DD or null"
        }
      ]
    }
  ]
}

Rules:
- 3 to 8 categories max
- Each category 3 to 12 items
- Use short, clear labels
- Avoid duplicates
- If travelers include kids/baby, add family-appropriate items
- Deadlines only for preparatifs type, null otherwise
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

  if (req.action === "destination_info") {
    const prompt = `
You are generating comprehensive travel information for a destination.
Return STRICT JSON only.

Destination: ${req.tripProfile.destination}
Trip dates: ${req.tripProfile.startDate || 'TBD'} to ${req.tripProfile.endDate || 'TBD'}

Required JSON format:
{
  "sections": [
    { 
      "title": "Choses importantes à savoir",
      "bullets": ["Essential info 1", "Essential info 2", "..."]
    },
    {
      "title": "Choses à éviter", 
      "bullets": ["Avoid this", "Don't do that", "..."]
    },
    {
      "title": "Faits intéressants",
      "bullets": ["Interesting fact 1", "Fun fact 2", "..."]
    },
    {
      "title": "Météo habituelle",
      "bullets": ["Climate info", "Best months", "What to expect", "..."]
    },
    {
      "title": "Coutumes locales",
      "bullets": ["Cultural custom 1", "Etiquette 2", "..."]
    },
    {
      "title": "Lois locales et règlements",
      "bullets": ["Legal requirement 1", "Restriction 2", "..."]
    },
    {
      "title": "Sécurité",
      "bullets": ["Safety tip 1", "Area to avoid", "Emergency numbers", "..."]
    },
    {
      "title": "Transport",
      "bullets": ["Public transport", "Taxi tips", "Driving info", "..."]
    },
    {
      "title": "Paiement et pourboires",
      "bullets": ["Currency", "Credit cards", "Tipping customs", "..."]
    }
  ]
}

Rules:
- EXACTLY 9 sections as shown above (keep the order)
- 3 to 6 bullets per section
- Bullets must be short, practical, and specific to the destination
- Include actual useful information, not generic travel advice
- Mention specific neighborhoods, customs, or local knowledge
- Be concise and actionable
`;

    const r = await openai.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const content = r.choices[0]?.message?.content ?? "{}";
    const obj = safeJsonParse<any>(content);

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
