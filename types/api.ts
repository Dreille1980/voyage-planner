// Types correspondant au backend

export type AgeGroup = "adult" | "teen" | "kid" | "baby";

export interface Traveler {
  id?: string;
  name: string;
  ageGroup: AgeGroup;
  notes?: string;
}

export type GroupType = "solo" | "couple" | "famille" | "amis" | "autre";
export type TripGoal = "detente" | "tourisme" | "sport" | "gastronomie" | "culturel" | "affaires" | "autre";
export type Pace = "relax" | "equilibre" | "intensif";

export interface Trip {
  id: string;
  name: string | null;
  destination: string;
  startDate: string | null;
  endDate: string | null;
  numberOfDays: number | null;
  groupType: string[] | null;
  numberOfPeople: number | null;
  tripGoal: string[] | null;
  tripType: string | null;
  style: string | null;
  budgetRange: string | null;
  pace: string | null;
  hasChildren: number | null;
  specialRequirements: string | null;
  createdAt: string;
  updatedAt: string;
  travelers?: Traveler[];
}

export interface CreateTripInput {
  name?: string;
  destination: string;
  startDate?: string;
  endDate?: string;
  numberOfDays?: number;
  groupType?: GroupType[];
  numberOfPeople?: number;
  tripGoal?: TripGoal[];
  tripType?: string;
  style?: string;
  budgetRange?: string;
  pace?: Pace;
  hasChildren?: boolean;
  specialRequirements?: string;
  travelers?: Traveler[];
}

export interface UpdateTripInput extends Partial<CreateTripInput> {}

export type ChecklistType = "preparatifs" | "bagage_soute" | "bagage_main";

export interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  assignedToAgeGroup: string | null;
  deadline: string | null;
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
  checklistType: ChecklistType;
  createdAt: string;
  updatedAt: string;
  categories: ChecklistCategory[];
}

export interface UpdateChecklistItemInput {
  label?: string;
  checked?: boolean;
  assignedToAgeGroup?: string | null;
  deadline?: string | null;
}

// AI Actions
export type AIAction = "generate_checklist" | "destination_info" | "trip_qna" | "generate_itinerary";

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
  id: string;
  tripId: string;
  sections: DestinationInfoSection[];
  updatedAt: string;
}

export interface TripQnAResponse {
  answer: string;
  sources: string[];
}

// Chat assistant types
export interface ChatMessage {
  id: string;
  tripId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface SendChatMessageResponse {
  userMessage: {
    role: "user";
    content: string;
  };
  assistantMessage: {
    role: "assistant";
    content: string;
    id: string;
    createdAt: string;
  };
  isRelevant: boolean;
}

// Itinerary types
export interface ItineraryActivity {
  id: string;
  time: string;
  title: string;
  description: string;
  type: "visit" | "food" | "transport" | "leisure" | "shopping" | "other";
  duration?: string;
  tips?: string;
}

export interface ItineraryDay {
  dayNumber: number;
  title: string;
  activities: ItineraryActivity[];
}

export interface Itinerary {
  id: string;
  tripId: string;
  days: ItineraryDay[];
  updatedAt: string;
}

// Reservation types
export type ReservationType = "flight" | "hotel" | "car" | "activity" | "restaurant" | "transport" | "other";

export interface Reservation {
  id: string;
  tripId: string;
  type: ReservationType;
  title: string;
  confirmationNumber: string | null;
  provider: string | null;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReservationInput {
  type: ReservationType;
  title: string;
  confirmationNumber?: string;
  provider?: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
}

export interface UpdateReservationInput extends Partial<CreateReservationInput> {}

// Weather types
export interface WeatherData {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  current?: {
    temperature_2m: number;
    weathercode: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
  };
  daily?: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    weathercode: number[];
  };
}
