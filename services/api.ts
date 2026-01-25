import config from "../config";
import type {
  Trip,
  CreateTripInput,
  UpdateTripInput,
  Checklist,
  ChecklistType,
  UpdateChecklistItemInput,
  ChecklistItem,
  AIRequest,
  DestinationInfo,
  TripQnAResponse,
} from "../types/api";

const API_URL = config.apiUrl;

// Helper pour les requêtes
async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: "Request failed",
    }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  // Pour les réponses 204 (No Content)
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// ===== TRIPS =====

export async function getAllTrips(): Promise<Trip[]> {
  return fetchAPI<Trip[]>("/trips");
}

export async function getTripById(id: string): Promise<Trip> {
  return fetchAPI<Trip>(`/trips/${id}`);
}

export async function createTrip(data: CreateTripInput): Promise<Trip> {
  return fetchAPI<Trip>("/trips", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateTrip(
  id: string,
  data: UpdateTripInput
): Promise<Trip> {
  return fetchAPI<Trip>(`/trips/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteTrip(id: string): Promise<void> {
  return fetchAPI<void>(`/trips/${id}`, {
    method: "DELETE",
  });
}

// ===== CHECKLISTS =====

export async function getAllChecklistsForTrip(
  tripId: string
): Promise<Checklist[]> {
  return fetchAPI<Checklist[]>(`/trips/${tripId}/checklists`);
}

export async function regenerateChecklist(
  tripId: string,
  checklistType: ChecklistType
): Promise<Checklist> {
  return fetchAPI<Checklist>(`/trips/${tripId}/checklists/${checklistType}/regenerate`, {
    method: "POST",
  });
}

export async function updateChecklistItem(
  itemId: string,
  data: UpdateChecklistItemInput
): Promise<ChecklistItem> {
  return fetchAPI<ChecklistItem>(`/checklist/items/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteChecklistItem(itemId: string): Promise<void> {
  return fetchAPI<void>(`/checklist/items/${itemId}`, {
    method: "DELETE",
  });
}

// ===== DESTINATION INFO =====

export async function getDestinationInfo(
  tripId: string
): Promise<DestinationInfo | null> {
  try {
    return await fetchAPI<DestinationInfo>(`/trips/${tripId}/destination-info`);
  } catch (error) {
    // Si les infos n'existent pas (404), retourne null
    if ((error as Error).message.includes("404")) {
      return null;
    }
    throw error;
  }
}

export async function regenerateDestinationInfo(tripId: string): Promise<DestinationInfo> {
  return fetchAPI<DestinationInfo>(`/trips/${tripId}/destination-info/regenerate`, {
    method: "POST",
  });
}

// ===== AI =====

export async function callAI(request: AIRequest): Promise<any> {
  return fetchAPI<any>("/ai", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function askTripQuestion(
  tripProfile: AIRequest["tripProfile"],
  question: string
): Promise<TripQnAResponse> {
  return callAI({
    action: "trip_qna",
    tripProfile,
    question,
  });
}

// ===== HEALTH CHECK =====

export async function checkHealth(): Promise<{ ok: boolean }> {
  return fetchAPI<{ ok: boolean }>("/health");
}
