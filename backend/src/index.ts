import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { ZodError } from "zod";

import { AiRequestSchema } from "./ai/schemas";
import { handleAi } from "./ai/handlers";
import { getDatabase } from "./db/connection";
import { CreateTripSchema, UpdateTripSchema, UpdateChecklistItemSchema } from "./db/schemas";
import { createTrip, getAllTripsForUser, getTripById, updateTrip, deleteTrip } from "./db/tripHandlers";
// import { getAllChecklistsForTrip, getChecklistByType, saveChecklist, updateChecklistItem, deleteChecklistItem } from "./db/checklistHandlers";
// import { getDestinationInfo, saveDestinationInfo } from "./db/destinationHandlers";
import { requireAuth } from "./auth/middleware";
import {
  handleRegister,
  handleLogin,
  handleRefreshToken,
  handleGetProfile,
  handleUpdateProfile,
  handleChangePassword,
} from "./auth/handlers";

const app = express();

// Initialize database on startup
getDatabase();

// Security headers
app.use(helmet());

// JSON body
app.use(express.json({ limit: "1mb" }));

// CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:8081",
  process.env.FRONTEND_URL_PROD,
  "http://localhost:19006", // Expo web
  "http://localhost:19000", // Expo dev
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === "development") {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

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

// === AUTHENTICATION ROUTES ===
app.post("/auth/register", handleRegister);
app.post("/auth/login", handleLogin);
app.post("/auth/refresh", handleRefreshToken);
app.get("/auth/profile", requireAuth, handleGetProfile);
app.put("/auth/profile", requireAuth, handleUpdateProfile);
app.post("/auth/change-password", requireAuth, handleChangePassword);

// API AI
app.post("/ai", requireAuth, async (req, res) => {
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

// GET /trips - Get all trips for authenticated user
app.get("/trips", requireAuth, async (req, res) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const trips = await getAllTripsForUser(req.user.userId);
    res.json(trips);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch trips", message: err.message });
  }
});

// GET /trips/:id - Get trip by ID
app.get("/trips/:id", requireAuth, async (req, res) => {
  try {
    const trip = await getTripById(req.params.id as string);
    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }
    res.json(trip);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch trip", message: err.message });
  }
});

// POST /trips - Create new trip (with automatic checklist & destination info generation)
app.post("/trips", requireAuth, async (req, res) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const data = CreateTripSchema.parse(req.body);
    const trip = await createTrip(data, req.user.userId);

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

    // TODO: Re-enable checklist/destination generation after converting handlers
    // Generate in background - don't await
    // Promise.all([
    //   // Generate 3 checklists
    //   handleAi({ action: "generate_checklist", tripProfile, checklistType: "preparatifs" })
    //     .then((result: any) => saveChecklist(trip.id, "preparatifs", result.categories))
    //     .catch(err => console.error("Failed to generate preparatifs checklist:", err)),
    //   
    //   handleAi({ action: "generate_checklist", tripProfile, checklistType: "bagage_soute" })
    //     .then((result: any) => saveChecklist(trip.id, "bagage_soute", result.categories))
    //     .catch(err => console.error("Failed to generate bagage_soute checklist:", err)),
    //   
    //   handleAi({ action: "generate_checklist", tripProfile, checklistType: "bagage_main" })
    //     .then((result: any) => saveChecklist(trip.id, "bagage_main", result.categories))
    //     .catch(err => console.error("Failed to generate bagage_main checklist:", err)),
    //   
    //   // Generate destination info
    //   handleAi({ action: "destination_info", tripProfile })
    //     .then((result: any) => saveDestinationInfo(trip.id, { sections: result.sections }))
    //     .catch(err => console.error("Failed to generate destination info:", err)),
    // ]);

    res.status(201).json(trip);
  } catch (err: any) {
    if (err instanceof ZodError) {
      return res.status(400).json({ error: "Invalid request body", details: err.issues });
    }
    res.status(500).json({ error: "Failed to create trip", message: err.message });
  }
});

// PUT /trips/:id - Update trip
app.put("/trips/:id", requireAuth, async (req, res) => {
  try {
    const data = UpdateTripSchema.parse(req.body);
    const trip = await updateTrip(req.params.id as string, data);
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
app.delete("/trips/:id", requireAuth, async (req, res) => {
  try {
    const success = await deleteTrip(req.params.id as string);
    if (!success) {
      return res.status(404).json({ error: "Trip not found" });
    }
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete trip", message: err.message });
  }
});

// === CHECKLISTS === (TEMPORARILY DISABLED - need PostgreSQL conversion)
// TODO: Convert checklistHandlers.ts and destinationHandlers.ts to support PostgreSQL

// // GET /trips/:tripId/checklists - Get all checklists for a trip
// app.get("/trips/:tripId/checklists", (req, res) => {
//   try {
//     const checklists = getAllChecklistsForTrip(req.params.tripId as string);
//     res.json(checklists);
//   } catch (err: any) {
//     res.status(500).json({ error: "Failed to fetch checklists", message: err.message });
//   }
// });

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`✅ Backend running on http://localhost:${port}`);
});
