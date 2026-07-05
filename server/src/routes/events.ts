import {
  createEventInputSchema,
  searchEventsQuerySchema,
  type CreateEventInput,
  type SearchEventsQuery,
} from "@sports-match/shared";
import { Router } from "express";
import mongoose, { type FilterQuery } from "mongoose";
import { AppError } from "../errors";
import { requireAuth } from "../middleware/requireAuth";
import { validate } from "../middleware/validate";
import { validateQuery } from "../middleware/validateQuery";
import { Event, toPublicEvent, type EventFields, type EventLean } from "../models/Event";
import { Place } from "../models/Place";
import { User } from "../models/User";

export const eventsRouter = Router();

// Documented cap (see phase 5 spec): no pagination at current scale.
const EVENTS_RESULT_CAP = 100;

async function requireUser(userId: string | undefined): Promise<{ username: string; trainer: boolean }> {
  const user = userId ? await User.findById(userId) : null;
  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "You must be logged in");
  }
  return { username: user.username, trainer: user.trainer };
}

eventsRouter.post("/", requireAuth, validate(createEventInputSchema), async (req, res) => {
  const input = req.body as CreateEventInput;
  const me = await requireUser(req.session.userId);

  if (input.type === "training" && !me.trainer) {
    throw new AppError(403, "FORBIDDEN", "Only trainers can create training events");
  }

  let placeSnapshot: { placeId: string | null; placeName: string | null; placeAddress: string | null } = {
    placeId: null,
    placeName: null,
    placeAddress: null,
  };
  if (input.placeId) {
    const place = mongoose.isValidObjectId(input.placeId) ? await Place.findById(input.placeId) : null;
    if (!place) {
      throw new AppError(400, "VALIDATION_ERROR", "Unknown place");
    }
    placeSnapshot = { placeId: place.id as string, placeName: place.name, placeAddress: place.address };
  }

  const event = await Event.create({
    title: input.title,
    sport: input.sport,
    type: input.type,
    description: input.description ?? null,
    host: me.username,
    hostTrainer: me.trainer,
    ...placeSnapshot,
    locationText: input.locationText ?? null,
    startsAt: new Date(input.startsAt),
    durationMinutes: input.durationMinutes,
    capacity: input.capacity,
    participants: input.type === "social" ? [me.username] : [],
    price: input.price ?? null,
    status: "active",
  });
  res.status(201).json({ event: toPublicEvent(event.toObject() as EventLean) });
});

eventsRouter.get("/", requireAuth, validateQuery(searchEventsQuerySchema), async (req, res) => {
  // Express 5's req.query is a read-only getter; validateQuery parks the parsed result here.
  const { type, sport } = res.locals.query as SearchEventsQuery;
  const me = await requireUser(req.session.userId);

  const filter: FilterQuery<EventFields> = {
    startsAt: { $gt: new Date() },
    // Cancelled events stay visible only to the people affected by them.
    $or: [{ status: "active" }, { host: me.username }, { participants: me.username }],
  };
  if (type) {
    filter.type = type;
  }
  if (sport) {
    filter.sport = sport;
  }
  const events = await Event.find(filter).sort({ startsAt: 1 }).limit(EVENTS_RESULT_CAP).lean<EventLean[]>();
  res.json({ events: events.map(toPublicEvent) });
});

async function loadEventOr404(id: string): Promise<EventLean> {
  const event = mongoose.isValidObjectId(id) ? await Event.findById(id).lean<EventLean>() : null;
  if (!event) {
    throw new AppError(404, "NOT_FOUND", "Event not found");
  }
  return event;
}

eventsRouter.post<{ id: string }>("/:id/join", requireAuth, async (req, res) => {
  const me = await requireUser(req.session.userId);
  const id = req.params.id;
  const now = new Date();

  const result = mongoose.isValidObjectId(id)
    ? await Event.updateOne(
        {
          _id: id,
          status: "active",
          startsAt: { $gt: now },
          participants: { $ne: me.username },
          // The capacity check lives INSIDE the update filter so two users
          // can never take the same last slot.
          $expr: { $lt: [{ $size: "$participants" }, "$capacity"] },
        },
        { $push: { participants: me.username } },
      )
    : { modifiedCount: 0 };

  if (result.modifiedCount === 0) {
    const event = await loadEventOr404(id);
    if (event.status === "cancelled") {
      throw new AppError(409, "EVENT_CANCELLED", "This event was cancelled");
    }
    if (event.startsAt <= now) {
      throw new AppError(409, "EVENT_STARTED", "This event has already started");
    }
    if (event.participants.includes(me.username)) {
      throw new AppError(409, "ALREADY_JOINED", "You already joined this event");
    }
    throw new AppError(409, "EVENT_FULL", "No spots left");
  }
  res.json({ event: toPublicEvent(await loadEventOr404(id)) });
});

eventsRouter.post<{ id: string }>("/:id/leave", requireAuth, async (req, res) => {
  const me = await requireUser(req.session.userId);
  const event = await loadEventOr404(req.params.id);
  if (event.host === me.username && event.type === "social") {
    throw new AppError(409, "HOST_CANNOT_LEAVE", "Hosts can't leave their own event — cancel it instead");
  }
  const result = await Event.updateOne({ _id: event._id }, { $pull: { participants: me.username } });
  if (result.modifiedCount === 0) {
    throw new AppError(409, "NOT_JOINED", "You haven't joined this event");
  }
  res.json({ event: toPublicEvent(await loadEventOr404(req.params.id)) });
});

eventsRouter.post<{ id: string }>("/:id/cancel", requireAuth, async (req, res) => {
  const me = await requireUser(req.session.userId);
  const event = await loadEventOr404(req.params.id);
  if (event.host !== me.username) {
    throw new AppError(403, "FORBIDDEN", "Only the host can cancel this event");
  }
  if (event.status === "cancelled") {
    throw new AppError(409, "EVENT_CANCELLED", "This event was already cancelled");
  }
  await Event.updateOne({ _id: event._id }, { $set: { status: "cancelled" } });
  res.json({ event: toPublicEvent(await loadEventOr404(req.params.id)) });
});
