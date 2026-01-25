import { z } from "zod";

export const ActionSchema = z.enum([
  "generate_checklist",
  "destination_info",
  "trip_qna",
]);

export const TripProfileSchema = z
  .object({
    destination: z.string().min(2),
    startDate: z.string().optional(), // ISO "2026-01-25"
    endDate: z.string().optional(),
    tripType: z.string().optional(), // "vacation" | "business" | etc (MVP: string)
    style: z.string().optional(), // "relaxed" | "planned" | "spontaneous"
    budgetRange: z.string().optional(), // "low" | "medium" | "high"
    travelers: z
      .array(
        z.object({
          name: z.string().min(1),
          ageGroup: z.enum(["adult", "teen", "kid", "baby"]),
          notes: z.string().optional(),
        })
      )
      .optional(),
  })
  .passthrough(); // permet d'ajouter d'autres champs plus tard sans casser

export const AiRequestSchema = z.object({
  action: ActionSchema,
  tripProfile: TripProfileSchema,
  question: z.string().optional(),
  checklistType: z.enum(["preparatifs", "bagage_soute", "bagage_main"]).optional(),
});

export type AiRequest = z.infer<typeof AiRequestSchema>;
