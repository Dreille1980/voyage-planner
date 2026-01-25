import { z } from "zod";

// Traveler schema
export const TravelerSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  ageGroup: z.enum(["adult", "teen", "kid", "baby"]),
  notes: z.string().optional(),
});

// Trip schemas
export const CreateTripSchema = z.object({
  name: z.string().optional(),
  destination: z.string().min(2),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  numberOfDays: z.number().int().positive().optional(),
  groupType: z.enum(["solo", "couple", "famille", "amis", "autre"]).optional(),
  numberOfPeople: z.number().int().positive().optional(),
  tripGoal: z.enum(["detente", "tourisme", "sport", "gastronomie", "culturel", "affaires", "autre"]).optional(),
  tripType: z.string().optional(),
  style: z.string().optional(),
  budgetRange: z.string().optional(),
  pace: z.enum(["relax", "equilibre", "intensif"]).optional(),
  hasChildren: z.boolean().optional(),
  specialRequirements: z.string().optional(),
  travelers: z.array(TravelerSchema).optional(),
});

export const UpdateTripSchema = CreateTripSchema.partial();

export const TripSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  destination: z.string(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  numberOfDays: z.number().nullable(),
  groupType: z.string().nullable(),
  numberOfPeople: z.number().nullable(),
  tripGoal: z.string().nullable(),
  tripType: z.string().nullable(),
  style: z.string().nullable(),
  budgetRange: z.string().nullable(),
  pace: z.string().nullable(),
  hasChildren: z.number().nullable(),
  specialRequirements: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  travelers: z.array(TravelerSchema).optional(),
});

// Checklist types
export const ChecklistTypeSchema = z.enum(["preparatifs", "bagage_soute", "bagage_main"]);

// Checklist Item schema
export const ChecklistItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  checked: z.boolean(),
  assignedToAgeGroup: z.string().nullable(),
  deadline: z.string().nullable(),
  orderIndex: z.number(),
});

export const UpdateChecklistItemSchema = z.object({
  label: z.string().optional(),
  checked: z.boolean().optional(),
  assignedToAgeGroup: z.string().nullish(),
  deadline: z.string().nullish(),
});

// Checklist Category schema
export const ChecklistCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  orderIndex: z.number(),
  items: z.array(ChecklistItemSchema),
});

// Full Checklist schema
export const ChecklistSchema = z.object({
  id: z.string(),
  tripId: z.string(),
  checklistType: ChecklistTypeSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  categories: z.array(ChecklistCategorySchema),
});

// Destination Info schema
export const DestinationInfoSectionSchema = z.object({
  title: z.string(),
  bullets: z.array(z.string()),
});

export const DestinationInfoSchema = z.object({
  id: z.string(),
  tripId: z.string(),
  sections: z.array(DestinationInfoSectionSchema),
  updatedAt: z.string(),
});

export type Traveler = z.infer<typeof TravelerSchema>;
export type CreateTrip = z.infer<typeof CreateTripSchema>;
export type UpdateTrip = z.infer<typeof UpdateTripSchema>;
export type Trip = z.infer<typeof TripSchema>;
export type ChecklistType = z.infer<typeof ChecklistTypeSchema>;
export type ChecklistItem = z.infer<typeof ChecklistItemSchema>;
export type ChecklistCategory = z.infer<typeof ChecklistCategorySchema>;
export type Checklist = z.infer<typeof ChecklistSchema>;
export type DestinationInfoSection = z.infer<typeof DestinationInfoSectionSchema>;
export type DestinationInfo = z.infer<typeof DestinationInfoSchema>;
