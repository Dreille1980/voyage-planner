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
import { getAllChecklistsForTrip, getChecklistByType, saveChecklist, updateChecklistItem, deleteChecklistItem } from "./db/checklistHandlers";
import { getDestinationInfo, saveDestinationInfo } from "./db/destinationHandlers";
import { getChatMessages, saveChatMessage, getTodayMessageCount } from "./db/chatHandlers";
import { getItinerary, saveItinerary, addItineraryActivity, updateItineraryActivity, deleteItineraryActivity } from "./db/itineraryHandlers";
import { getReservationsForTrip, createReservation, updateReservation, deleteReservation } from "./db/reservationHandlers";
import { requireAuth } from "./auth/middleware";
import {
  handleRegister,
  handleLogin,
  handleRefreshToken,
  handleGetProfile,
  handleUpdateProfile,
  handleChangePassword,
} from "./auth/handlers";

// Helper to extract user language from request headers
function getUserLanguage(req: express.Request): "fr" | "en" | "es" | "de" {
  const acceptLanguage = req.headers["accept-language"] || req.headers["x-user-language"] || "";
  const langHeader = Array.isArray(acceptLanguage) ? (acceptLanguage[0] || "") : acceptLanguage;
  const lang = langHeader.split(",")[0]?.split("-")[0]?.toLowerCase() || "en";
  
  if (lang === "fr" || lang === "en" || lang === "es" || lang === "de") {
    return lang;
  }
  return "en"; // Default to English
}

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

    // Get user language
    const userLanguage = getUserLanguage(req);

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

    // Generate checklists, destination info, and itinerary in background - don't await
    Promise.all([
      // Generate 3 checklists
      handleAi({ action: "generate_checklist", tripProfile, checklistType: "preparatifs", userLanguage })
        .then((result: any) => saveChecklist(trip.id, "preparatifs", result.categories))
        .catch(err => console.error("Failed to generate preparatifs checklist:", err)),
      
      handleAi({ action: "generate_checklist", tripProfile, checklistType: "bagage_soute", userLanguage })
        .then((result: any) => saveChecklist(trip.id, "bagage_soute", result.categories))
        .catch(err => console.error("Failed to generate bagage_soute checklist:", err)),
      
      handleAi({ action: "generate_checklist", tripProfile, checklistType: "bagage_main", userLanguage })
        .then((result: any) => saveChecklist(trip.id, "bagage_main", result.categories))
        .catch(err => console.error("Failed to generate bagage_main checklist:", err)),
      
      // Generate destination info
      handleAi({ action: "destination_info", tripProfile, userLanguage })
        .then((result: any) => saveDestinationInfo(trip.id, { sections: result.sections }))
        .catch(err => console.error("Failed to generate destination info:", err)),

      // Generate itinerary
      handleAi({ action: "generate_itinerary", tripProfile: { ...tripProfile, numberOfDays: trip.numberOfDays }, userLanguage })
        .then((result: any) => saveItinerary(trip.id, { days: result.days }))
        .catch(err => console.error("Failed to generate itinerary:", err)),
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

// === CHECKLISTS ===

// GET /trips/:tripId/checklists - Get all checklists for a trip
app.get("/trips/:tripId/checklists", requireAuth, async (req, res) => {
  try {
    const checklists = await getAllChecklistsForTrip(req.params.tripId as string);
    res.json(checklists);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch checklists", message: err.message });
  }
});

// GET /trips/:tripId/checklists/:type - Get specific checklist
app.get("/trips/:tripId/checklists/:type", requireAuth, async (req, res) => {
  try {
    const checklist = await getChecklistByType(
      req.params.tripId as string,
      req.params.type as any
    );
    if (!checklist) {
      return res.status(404).json({ error: "Checklist not found" });
    }
    res.json(checklist);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch checklist", message: err.message });
  }
});

// PATCH /checklists/items/:itemId - Update checklist item
app.patch("/checklists/items/:itemId", requireAuth, async (req, res) => {
  try {
    const updates = UpdateChecklistItemSchema.parse(req.body);
    const item = await updateChecklistItem(req.params.itemId as string, updates);
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

// DELETE /checklists/items/:itemId - Delete checklist item
app.delete("/checklists/items/:itemId", requireAuth, async (req, res) => {
  try {
    const success = await deleteChecklistItem(req.params.itemId as string);
    if (!success) {
      return res.status(404).json({ error: "Item not found" });
    }
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete item", message: err.message });
  }
});

// POST /trips/:tripId/checklists/:type/regenerate - Regenerate a checklist
app.post("/trips/:tripId/checklists/:type/regenerate", requireAuth, async (req, res) => {
  try {
    const tripId = req.params.tripId as string;
    const checklistType = req.params.type as "preparatifs" | "bagage_soute" | "bagage_main";

    // Get trip details
    const trip = await getTripById(tripId);
    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }

    // Get user language
    const userLanguage = getUserLanguage(req);

    // Build trip profile
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

    // Generate new checklist
    const result = await handleAi({ 
      action: "generate_checklist", 
      tripProfile, 
      checklistType, 
      userLanguage 
    });

    // Save the regenerated checklist
    const checklist = await saveChecklist(tripId, checklistType, result.categories);

    res.json(checklist);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to regenerate checklist", message: err.message });
  }
});

// === DESTINATION INFO ===

// GET /trips/:tripId/destination - Get destination info
app.get("/trips/:tripId/destination", requireAuth, async (req, res) => {
  try {
    const info = await getDestinationInfo(req.params.tripId as string);
    if (!info) {
      return res.status(404).json({ error: "Destination info not found" });
    }
    res.json(info);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch destination info", message: err.message });
  }
});

// POST /trips/:tripId/destination/regenerate - Regenerate destination info
app.post("/trips/:tripId/destination/regenerate", requireAuth, async (req, res) => {
  try {
    const tripId = req.params.tripId as string;

    // Get trip details
    const trip = await getTripById(tripId);
    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }

    // Get user language
    const userLanguage = getUserLanguage(req);

    // Build trip profile
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

    // Generate new destination info
    const result = await handleAi({ 
      action: "destination_info", 
      tripProfile, 
      userLanguage 
    });

    // Save the regenerated destination info
    const destinationInfo = await saveDestinationInfo(tripId, { sections: result.sections });

    res.json(destinationInfo);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to regenerate destination info", message: err.message });
  }
});

// === CHAT ASSISTANT ===

// GET /trips/:tripId/chat - Get all chat messages for a trip
app.get("/trips/:tripId/chat", requireAuth, async (req, res) => {
  try {
    const messages = await getChatMessages(req.params.tripId as string);
    res.json(messages);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch chat messages", message: err.message });
  }
});

// POST /trips/:tripId/chat - Send a message and get AI response
app.post("/trips/:tripId/chat", requireAuth, async (req, res) => {
  try {
    const tripId = req.params.tripId as string;
    const { message } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Check daily limit (15 questions per day)
    const todayCount = await getTodayMessageCount(tripId);
    if (todayCount >= 15) {
      return res.status(429).json({
        error: "Limite quotidienne atteinte",
        message: "Vous avez atteint la limite de 15 questions par jour pour ce voyage. Réessayez demain!",
      });
    }

    // Get trip details
    const trip = await getTripById(tripId);
    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }

    // Get conversation history
    const conversationHistory = await getChatMessages(tripId);

    // Build trip profile
    const tripProfile = {
      destination: trip.destination,
      startDate: trip.startDate || undefined,
      endDate: trip.endDate || undefined,
      tripType: trip.tripType || undefined,
      style: trip.style || undefined,
      budgetRange: trip.budgetRange || undefined,
      numberOfPeople: trip.numberOfPeople || undefined,
      pace: trip.pace || undefined,
      tripGoal: trip.tripGoal ? (typeof trip.tripGoal === 'string' ? JSON.parse(trip.tripGoal) : trip.tripGoal) : undefined,
      travelers: trip.travelers?.map(t => ({
        name: t.name,
        ageGroup: t.ageGroup,
        notes: t.notes,
      })),
    };

    // Save user message
    await saveChatMessage(tripId, "user", message.trim());

    // Get user language
    const userLanguage = getUserLanguage(req);

    // Get AI response
    const aiResponse = await handleAi({
      action: "trip_qna",
      tripProfile,
      question: message.trim(),
      conversationHistory: conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      userLanguage,
    });

    // Save assistant response
    const assistantMessage = await saveChatMessage(
      tripId,
      "assistant",
      aiResponse.answer
    );

    res.json({
      userMessage: { role: "user", content: message.trim() },
      assistantMessage: {
        role: "assistant",
        content: aiResponse.answer,
        id: assistantMessage.id,
        createdAt: assistantMessage.createdAt,
      },
      isRelevant: aiResponse.isRelevant,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to process chat message", message: err.message });
  }
});

// === ITINERARY ===

// GET /trips/:tripId/itinerary - Get itinerary for a trip
app.get("/trips/:tripId/itinerary", requireAuth, async (req, res) => {
  try {
    const itinerary = await getItinerary(req.params.tripId as string);
    if (!itinerary) {
      return res.status(404).json({ error: "Itinerary not found" });
    }
    res.json(itinerary);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch itinerary", message: err.message });
  }
});

// POST /trips/:tripId/itinerary/regenerate - Regenerate itinerary
app.post("/trips/:tripId/itinerary/regenerate", requireAuth, async (req, res) => {
  try {
    const tripId = req.params.tripId as string;
    const trip = await getTripById(tripId);
    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }

    const userLanguage = getUserLanguage(req);
    const tripProfile = {
      destination: trip.destination,
      startDate: trip.startDate || undefined,
      endDate: trip.endDate || undefined,
      numberOfDays: trip.numberOfDays || undefined,
      tripType: trip.tripType || undefined,
      style: trip.style || undefined,
      budgetRange: trip.budgetRange || undefined,
      travelers: trip.travelers?.map(t => ({
        name: t.name,
        ageGroup: t.ageGroup,
        notes: t.notes,
      })),
    };

    const result = await handleAi({ action: "generate_itinerary", tripProfile, userLanguage });
    const itinerary = await saveItinerary(tripId, { days: result.days });
    res.json(itinerary);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to regenerate itinerary", message: err.message });
  }
});

// POST /trips/:tripId/itinerary/days/:dayNumber/activities - Add activity to a day
app.post("/trips/:tripId/itinerary/days/:dayNumber/activities", requireAuth, async (req, res) => {
  try {
    const { time, title, description, type, duration, tips } = req.body;
    if (!time || !title || !description || !type) {
      return res.status(400).json({ error: "time, title, description, and type are required" });
    }
    const itinerary = await addItineraryActivity(
      req.params.tripId as string,
      parseInt(req.params.dayNumber as string),
      { time, title, description, type, duration, tips }
    );
    if (!itinerary) {
      return res.status(404).json({ error: "Itinerary or day not found" });
    }
    res.json(itinerary);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to add activity", message: err.message });
  }
});

// PUT /trips/:tripId/itinerary/days/:dayNumber/activities/:activityId - Update activity
app.put("/trips/:tripId/itinerary/days/:dayNumber/activities/:activityId", requireAuth, async (req, res) => {
  try {
    const itinerary = await updateItineraryActivity(
      req.params.tripId as string,
      parseInt(req.params.dayNumber as string),
      req.params.activityId as string,
      req.body
    );
    if (!itinerary) {
      return res.status(404).json({ error: "Itinerary, day, or activity not found" });
    }
    res.json(itinerary);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update activity", message: err.message });
  }
});

// DELETE /trips/:tripId/itinerary/days/:dayNumber/activities/:activityId - Delete activity
app.delete("/trips/:tripId/itinerary/days/:dayNumber/activities/:activityId", requireAuth, async (req, res) => {
  try {
    const itinerary = await deleteItineraryActivity(
      req.params.tripId as string,
      parseInt(req.params.dayNumber as string),
      req.params.activityId as string
    );
    if (!itinerary) {
      return res.status(404).json({ error: "Itinerary, day, or activity not found" });
    }
    res.json(itinerary);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete activity", message: err.message });
  }
});

// === RESERVATIONS ===

// GET /trips/:tripId/reservations - Get all reservations for a trip
app.get("/trips/:tripId/reservations", requireAuth, async (req, res) => {
  try {
    const reservations = await getReservationsForTrip(req.params.tripId as string);
    res.json(reservations);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch reservations", message: err.message });
  }
});

// POST /trips/:tripId/reservations - Create a reservation
app.post("/trips/:tripId/reservations", requireAuth, async (req, res) => {
  try {
    const { type, title, confirmationNumber, provider, startDate, endDate, notes } = req.body;
    if (!type || !title) {
      return res.status(400).json({ error: "type and title are required" });
    }
    const reservation = await createReservation(req.params.tripId as string, {
      type, title, confirmationNumber, provider, startDate, endDate, notes
    });
    res.status(201).json(reservation);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to create reservation", message: err.message });
  }
});

// PUT /reservations/:id - Update a reservation
app.put("/reservations/:id", requireAuth, async (req, res) => {
  try {
    const reservation = await updateReservation(req.params.id as string, req.body);
    if (!reservation) {
      return res.status(404).json({ error: "Reservation not found" });
    }
    res.json(reservation);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update reservation", message: err.message });
  }
});

// DELETE /reservations/:id - Delete a reservation
app.delete("/reservations/:id", requireAuth, async (req, res) => {
  try {
    const success = await deleteReservation(req.params.id as string);
    if (!success) {
      return res.status(404).json({ error: "Reservation not found" });
    }
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete reservation", message: err.message });
  }
});

// === ADD CHECKLIST ITEM ===

// POST /checklists/categories/:categoryId/items - Add a custom item to a checklist category
app.post("/checklists/categories/:categoryId/items", requireAuth, async (req, res) => {
  try {
    const { label } = req.body;
    if (!label || typeof label !== "string" || !label.trim()) {
      return res.status(400).json({ error: "label is required" });
    }

    const { randomUUID } = await import("crypto");
    const db = getDatabase();
    const categoryId = req.params.categoryId as string;
    const usePostgres = !!process.env.DATABASE_URL;

    if (usePostgres) {
      const { Pool } = await import("pg");
      const pool = db as InstanceType<typeof Pool>;

      // Get max order_index for this category
      const maxResult = await pool.query(
        `SELECT COALESCE(MAX(order_index), -1) as max_index FROM checklist_items WHERE category_id = $1`,
        [categoryId]
      );
      const nextIndex = (maxResult.rows[0]?.max_index ?? -1) + 1;

      const id = randomUUID();
      await pool.query(
        `INSERT INTO checklist_items (id, category_id, label, checked, assigned_to_age_group, deadline, order_index)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, categoryId, label.trim(), false, null, null, nextIndex]
      );

      const result = await pool.query(
        `SELECT id, label, checked, assigned_to_age_group as "assignedToAgeGroup",
                deadline, order_index as "orderIndex"
         FROM checklist_items WHERE id = $1`,
        [id]
      );
      res.status(201).json(result.rows[0]);
    } else {
      const sqlite = db as any;

      // Get max orderIndex for this category
      const maxRow = sqlite
        .prepare(`SELECT COALESCE(MAX(orderIndex), -1) as maxIndex FROM checklist_items WHERE categoryId = ?`)
        .get(categoryId) as any;
      const nextIndex = (maxRow?.maxIndex ?? -1) + 1;

      const id = randomUUID();
      sqlite
        .prepare(
          `INSERT INTO checklist_items (id, categoryId, label, checked, assignedToAgeGroup, deadline, orderIndex)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(id, categoryId, label.trim(), 0, null, null, nextIndex);

      const item = sqlite.prepare("SELECT * FROM checklist_items WHERE id = ?").get(id) as any;
      res.status(201).json({
        id: item.id,
        label: item.label,
        checked: item.checked === 1,
        assignedToAgeGroup: item.assignedToAgeGroup,
        deadline: item.deadline,
        orderIndex: item.orderIndex,
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: "Failed to add checklist item", message: err.message });
  }
});

// === WEATHER PROXY ===

// GET /weather?lat=XX&lon=XX or GET /weather?city=CityName
app.get("/weather", requireAuth, async (req, res) => {
  try {
    const { city, lat, lon } = req.query;

    // Use Open-Meteo (free, no API key required)
    let url: string;

    if (lat && lon) {
      url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode&timezone=auto&forecast_days=7`;
    } else if (city) {
      // First geocode the city using Open-Meteo geocoding
      const geoResponse = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city as string)}&count=1&language=fr`
      );
      const geoData = await geoResponse.json() as any;

      if (!geoData.results || geoData.results.length === 0) {
        return res.status(404).json({ error: "City not found" });
      }

      const { latitude, longitude, name, country } = geoData.results[0];
      url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode&timezone=auto&forecast_days=7&current=temperature_2m,weathercode,apparent_temperature,relative_humidity_2m,wind_speed_10m`;

      const weatherResponse = await fetch(url);
      const weatherData = await weatherResponse.json();

      return res.json({
        city: name,
        country,
        latitude,
        longitude,
        ...weatherData,
      });
    } else {
      return res.status(400).json({ error: "city or lat/lon required" });
    }

    const weatherResponse = await fetch(url);
    const weatherData = await weatherResponse.json();
    res.json(weatherData);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch weather", message: err.message });
  }
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`✅ Backend running on http://localhost:${port}`);
});
