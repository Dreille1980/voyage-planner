// Types correspondant au backend

export type AgeGroup = "adult" | "teen" | "kid" | "baby";

export interface Traveler {
  id?: string;
  name: string;
  ageGroup: AgeGroup;
  notes?: string;
}

export interface Trip {
  id: string;
  destination: string;
  startDate: string | null;
  endDate: string | null;
  tripType: string | null;
  style: string | null;
  budgetRange: string | null;
  createdAt: string;
  updatedAt: string;
  travelers?: Traveler[];
}

export interface CreateTripInput {
  destination: string;
  startDate?: string;
  endDate?: string;
  tripType?: string;
  style?: string;
  budgetRange?: string;
  travelers?: Traveler[];
}

export interface UpdateTripInput extends Partial<CreateTripInput> {}

export interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  assignedToAgeGroup: string | null;
  orderIndex: number;
}

export interface ChecklistCategory {
  id: string;
  name: string;
  orderIndex: number;
  items: ChecklistItem[];
}

export interface Checklist {
  id: string;
  tripId: string;
  createdAt: string;
  updatedAt: string;
  categories: ChecklistCategory[];
}

export interface UpdateChecklistItemInput {
  label?: string;
  checked?: boolean;
  assignedToAgeGroup?: string | null;
}

// AI Actions
export type AIAction = "generate_checklist" | "destination_info" | "trip_qna";

export interface TripProfile {
  destination: string;
  startDate?: string;
  endDate?: string;
  tripType?: string;
  style?: string;
  budgetRange?: string;
  travelers?: Traveler[];
}

export interface AIRequest {
  action: AIAction;
  tripProfile: TripProfile;
  question?: string;
}

export interface DestinationInfoSection {
  title: string;
  bullets: string[];
}

export interface DestinationInfo {
  sections: DestinationInfoSection[];
  updatedAt: string;
}

export interface TripQnAResponse {
  answer: string;
  sources: string[];
}
