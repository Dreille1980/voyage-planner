import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { ZodError } from "zod";

import { AiRequestSchema } from "./ai/schemas";
import { handleAi } from "./ai/handlers";
import { getDatabase } from "./db/connection";
import { CreateTripSchema, UpdateTripSchema, UpdateChecklistItemSchema } from "./db/schemas";
import { createTrip, getAllTrips, getTripById, updateTrip, deleteTrip } from "./db/tripHandlers";
import { getAllChecklistsForTrip, getChecklistByType, saveChecklist, updateChecklistItem, deleteChecklistItem } from "./db/checklistHandlers";
import { getDestinationInfo, saveDestinationInfo } from "./db/destinationHandlers";

const app = express();

// Initialize database on startup
getDatabase();

// JSON body
app.use(express.json({ limit: "1mb" }));

// CORS (MVP: permissif; tu peux restreindre ensuite)
app.use(cors());

// Rate limit (anti-abus)
app.use(
  rateLimit({
    windowMs: 60 * 1000, // 1 min
    max: 60, // 60 req/min par IP
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Health check (utile pour Render)
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// API AI
app.post("/ai", async (req, res) => {
  try {
    const parsed = AiRequestSchema.parse(req.body);
    const result = await handleAi(parsed);
    res.json(result);
  } catch (err: any) {
    // Zod validation errors
    if (err instanceof ZodError) {
      return res.status(400).json({
        error: "Invalid request body",
        details: err.issues,
      });
    }

    // Common runtime errors
    const message = err?.message ?? "Unknown error";
    res.status(500).json({
      error: "AI request failed",
      message,
    });
  }
});

// === TRIPS CRUD ===

// GET /trips - Get all trips
app.get("/trips", (_req, res) => {
  try {
    const trips = getAllTrips();
    res.json(trips);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch trips", message: err.message });
  }
});

// GET /trips/:id - Get trip by ID
app.get("/trips/:id", (req, res) => {
  try {
    const trip = getTripById(req.params.id);
    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }
    res.json(trip);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch trip", message: err.message });
  }
});

// POST /trips - Create new trip (with automatic checklist & destination info generation)
app.post("/trips", async (req, res) => {
  try {
    const data = CreateTripSchema.parse(req.body);
    const trip = createTrip(data);

    // Generate checklists and destination info asynchronously (don't block response)
    const tripProfile = {
      destination: trip.destination,
      startDate: trip.startDate || undefined,
      endDate: trip.endDate || undefined,
      tripType: trip.tripType || undefined,
      style: trip.style || undefined,
      budgetRange: trip.budgetRange || undefined,
      travelers: trip.travelers?.map(t => ({
        name: t.name,
        ageGroup: t.ageGroup,
        notes: t.notes,
      })),
    };

    // Generate in background - don't await
    Promise.all([
      // Generate 3 checklists
      handleAi({ action: "generate_checklist", tripProfile, checklistType: "preparatifs" })
        .then((result: any) => saveChecklist(trip.id, "preparatifs", result.categories))
        .catch(err => console.error("Failed to generate preparatifs checklist:", err)),
      
      handleAi({ action: "generate_checklist", tripProfile, checklistType: "bagage_soute" })
        .then((result: any) => saveChecklist(trip.id, "bagage_soute", result.categories))
        .catch(err => console.error("Failed to generate bagage_soute checklist:", err)),
      
      handleAi({ action: "generate_checklist", tripProfile, checklistType: "bagage_main" })
        .then((result: any) => saveChecklist(trip.id, "bagage_main", result.categories))
        .catch(err => console.error("Failed to generate bagage_main checklist:", err)),
      
      // Generate destination info
      handleAi({ action: "destination_info", tripProfile })
        .then((result: any) => saveDestinationInfo(trip.id, { sections: result.sections }))
        .catch(err => console.error("Failed to generate destination info:", err)),
    ]);

    res.status(201).json(trip);
  } catch (err: any) {
    if (err instanceof ZodError) {
      return res.status(400).json({ error: "Invalid request body", details: err.issues });
    }
    res.status(500).json({ error: "Failed to create trip", message: err.message });
  }
});

// PUT /trips/:id - Update trip
app.put("/trips/:id", (req, res) => {
  try {
    const data = UpdateTripSchema.parse(req.body);
    const trip = updateTrip(req.params.id, data);
    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }
    res.json(trip);
  } catch (err: any) {
    if (err instanceof ZodError) {
      return res.status(400).json({ error: "Invalid request body", details: err.issues });
    }
    res.status(500).json({ error: "Failed to update trip", message: err.message });
  }
});

// DELETE /trips/:id - Delete trip
app.delete("/trips/:id", (req, res) => {
  try {
    const success = deleteTrip(req.params.id);
    if (!success) {
      return res.status(404).json({ error: "Trip not found" });
    }
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete trip", message: err.message });
  }
});

// === CHECKLISTS ===

// GET /trips/:tripId/checklists - Get all checklists for a trip
app.get("/trips/:tripId/checklists", (req, res) => {
  try {
    const checklists = getAllChecklistsForTrip(req.params.tripId);
    res.json(checklists);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch checklists", message: err.message });
  }
});

// POST /trips/:tripId/checklists/:type/regenerate - Regenerate a specific checklist
app.post("/trips/:tripId/checklists/:type/regenerate", async (req, res) => {
  try {
    const { tripId, type } = req.params;
    
    // Validate checklist type
    if (!["preparatifs", "bagage_soute", "bagage_main"].includes(type)) {
      return res.status(400).json({ error: "Invalid checklist type" });
    }

    // Get trip info
    const trip = getTripById(tripId);
    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }

    // Call AI to generate checklist
    const aiResult = await handleAi({
      action: "generate_checklist",
      tripProfile: {
        destination: trip.destination,
        startDate: trip.startDate || undefined,
        endDate: trip.endDate || undefined,
        tripType: trip.tripType || undefined,
        style: trip.style || undefined,
        budgetRange: trip.budgetRange || undefined,
        travelers: trip.travelers?.map(t => ({
          name: t.name,
          ageGroup: t.ageGroup,
          notes: t.notes,
        })),
      },
      checklistType: type as any,
    }) as any;

    // Save checklist to database
    const checklist = saveChecklist(tripId, type as any, aiResult.categories);
    res.json(checklist);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to regenerate checklist", message: err.message });
  }
});

// PATCH /checklist/items/:itemId - Update checklist item
app.patch("/checklist/items/:itemId", (req, res) => {
  try {
    const data = UpdateChecklistItemSchema.parse(req.body);
    const updates: any = {};
    if (data.label !== undefined) updates.label = data.label;
    if (data.checked !== undefined) updates.checked = data.checked;
    if (data.assignedToAgeGroup !== undefined) updates.assignedToAgeGroup = data.assignedToAgeGroup;
    if (data.deadline !== undefined) updates.deadline = data.deadline;
    
    const item = updateChecklistItem(req.params.itemId, updates);
    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }
    res.json(item);
  } catch (err: any) {
    if (err instanceof ZodError) {
      return res.status(400).json({ error: "Invalid request body", details: err.issues });
    }
    res.status(500).json({ error: "Failed to update item", message: err.message });
  }
});

// DELETE /checklist/items/:itemId - Delete checklist item
app.delete("/checklist/items/:itemId", (req, res) => {
  try {
    const success = deleteChecklistItem(req.params.itemId);
    if (!success) {
      return res.status(404).json({ error: "Item not found" });
    }
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete item", message: err.message });
  }
});

// === DESTINATION INFO ===

// GET /trips/:tripId/destination-info - Get destination info for a trip
app.get("/trips/:tripId/destination-info", (req, res) => {
  try {
    const info = getDestinationInfo(req.params.tripId);
    if (!info) {
      return res.status(404).json({ error: "Destination info not found" });
    }
    res.json(info);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch destination info", message: err.message });
  }
});

// POST /trips/:tripId/destination-info/regenerate - Regenerate destination info
app.post("/trips/:tripId/destination-info/regenerate", async (req, res) => {
  try {
    const tripId = req.params.tripId;
    
    // Get trip info
    const trip = getTripById(tripId);
    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }

    // Call AI to generate destination info
    const aiResult = await handleAi({
      action: "destination_info",
      tripProfile: {
        destination: trip.destination,
        startDate: trip.startDate || undefined,
        endDate: trip.endDate || undefined,
        tripType: trip.tripType || undefined,
        style: trip.style || undefined,
        budgetRange: trip.budgetRange || undefined,
        travelers: trip.travelers?.map(t => ({
          name: t.name,
          ageGroup: t.ageGroup,
          notes: t.notes,
        })),
      },
    }) as any;

    // Save to database
    const info = saveDestinationInfo(tripId, { sections: aiResult.sections });
    res.json(info);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to regenerate destination info", message: err.message });
  }
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`✅ Backend running on http://localhost:${port}`);
});
