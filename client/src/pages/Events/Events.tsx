import type { ActivityKey, CreateEventInput, EventType, PublicEvent } from "@sports-match/shared";
import { createEventInputSchema } from "@sports-match/shared";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CLIENT_ACTIVITIES } from "../../activities/catalogue";
import * as eventsApi from "../../api/events";
import { ApiError } from "../../api/http";
import * as placesApi from "../../api/places";
import CustomAlert from "../../components/CustomAlert/CustomAlert";
import Radar from "../../components/Orbit/Radar";
import { useAuth } from "../../context/AuthContext";
import { eventCardState } from "./eventCardState";
import { formatEventDate } from "./formatEventDate";
import "./Events.scss";

const sortedActivities = [...CLIENT_ACTIVITIES].sort((a, b) => a.label.localeCompare(b.label));
const TYPE_FILTERS: { value: "" | EventType; label: string }[] = [
  { value: "", label: "All" },
  { value: "training", label: "Training" },
  { value: "social", label: "Social" },
];

interface FormState {
  title: string;
  sport: string;
  type: EventType;
  description: string;
  placeId: string;
  locationText: string;
  startsAt: string;
  durationMinutes: string;
  capacity: string;
  price: string;
}

const EMPTY_FORM: FormState = {
  title: "",
  sport: "",
  type: "social",
  description: "",
  placeId: "",
  locationText: "",
  startsAt: "",
  durationMinutes: "60",
  capacity: "6",
  price: "",
};

export default function EventsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [typeFilter, setTypeFilter] = useState<"" | EventType>("");
  const [sportFilter, setSportFilter] = useState("");
  const [places, setPlaces] = useState<{ id: string; name: string }[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  // Safe: this route renders inside RequireAuth, which blocks until the auth check resolves.
  const me = user?.username ?? "";

  const refresh = useCallback(async () => {
    try {
      const results = await eventsApi.searchEvents({
        type: typeFilter || undefined,
        // Select options come from the catalogue, so the value is a valid key or "".
        sport: (sportFilter || undefined) as ActivityKey | undefined,
      });
      setEvents(results);
      setError("");
    } catch {
      setEvents([]);
      setError("Could not load events. Please try again.");
    }
  }, [typeFilter, sportFilter]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    placesApi
      .searchPlaces({})
      .then((results) => setPlaces(results.map((place) => ({ id: place.id, name: place.name }))))
      .catch(() => setPlaces([]));
  }, []);

  const setField = (field: keyof FormState) => (value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const candidate: CreateEventInput = {
      title: form.title,
      sport: form.sport as ActivityKey,
      type: form.type,
      description: form.description || undefined,
      placeId: form.placeId || undefined,
      locationText: form.placeId ? undefined : form.locationText || undefined,
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : "",
      durationMinutes: Number(form.durationMinutes),
      capacity: Number(form.capacity),
      price: form.type === "training" && form.price ? form.price : undefined,
    };
    const parsed = createEventInputSchema.safeParse(candidate);
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Check the form");
      return;
    }
    try {
      await eventsApi.createEvent(parsed.data);
      setForm(EMPTY_FORM);
      setShowForm(false);
      setFormError("");
      await refresh();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not create the event.");
    }
  };

  const membership = async (id: string, action: "join" | "leave" | "cancel") => {
    setBusyId(id);
    try {
      if (action === "join") {
        await eventsApi.joinEvent(id);
      } else if (action === "leave") {
        await eventsApi.leaveEvent(id);
      } else {
        await eventsApi.cancelEvent(id);
      }
      setError("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusyId("");
      await refresh();
    }
  };

  return (
    <div className="eventsPage">
      <header className="eventsPage__head">
        <div>
          <h1 className="eventsPage__title">Events</h1>
          <p className="eventsPage__subtitle">Join a session or start your own</p>
        </div>
        <button type="button" className="eventsPage__create" onClick={() => setShowForm((open) => !open)}>
          {showForm ? "Close" : "Create event"}
        </button>
      </header>

      <div className="eventsPage__filters">
        <div className="eventsPage__segments" role="group" aria-label="Event type">
          {TYPE_FILTERS.map((option) => (
            <button
              key={option.label}
              type="button"
              className={typeFilter === option.value ? "eventsPage__segment eventsPage__segment--active" : "eventsPage__segment"}
              onClick={() => setTypeFilter(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <select
          className="eventsPage__select"
          aria-label="Filter by sport"
          value={sportFilter}
          onChange={(e) => setSportFilter(e.target.value)}
        >
          <option value="">All sports</option>
          {sortedActivities.map((activity) => (
            <option key={activity.key} value={activity.key}>
              {activity.label}
            </option>
          ))}
        </select>
      </div>

      {showForm && (
        <form className="eventForm" onSubmit={handleCreate}>
          <div className="eventForm__grid">
            <label className="eventForm__field">
              Title
              <input className="eventForm__input" value={form.title} onChange={(e) => setField("title")(e.target.value)} required />
            </label>
            <label className="eventForm__field">
              Sport
              <select className="eventForm__input" value={form.sport} onChange={(e) => setField("sport")(e.target.value)} required>
                <option value="">Choose a sport</option>
                {sortedActivities.map((activity) => (
                  <option key={activity.key} value={activity.key}>
                    {activity.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="eventForm__field">
              Type
              <select className="eventForm__input" value={form.type} onChange={(e) => setField("type")(e.target.value)}>
                <option value="social">Social</option>
                {user?.trainer && <option value="training">Training</option>}
              </select>
            </label>
            <label className="eventForm__field">
              Venue
              <select className="eventForm__input" value={form.placeId} onChange={(e) => setField("placeId")(e.target.value)}>
                <option value="">Custom location…</option>
                {places.map((place) => (
                  <option key={place.id} value={place.id}>
                    {place.name}
                  </option>
                ))}
              </select>
            </label>
            {!form.placeId && (
              <label className="eventForm__field">
                Location
                <input
                  className="eventForm__input"
                  placeholder="e.g. Южен парк, входа"
                  value={form.locationText}
                  onChange={(e) => setField("locationText")(e.target.value)}
                />
              </label>
            )}
            <label className="eventForm__field">
              Starts at
              <input
                className="eventForm__input"
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => setField("startsAt")(e.target.value)}
                required
              />
            </label>
            <label className="eventForm__field">
              Duration (min)
              <input
                className="eventForm__input"
                type="number"
                min={15}
                max={480}
                value={form.durationMinutes}
                onChange={(e) => setField("durationMinutes")(e.target.value)}
              />
            </label>
            <label className="eventForm__field">
              Spots
              <input
                className="eventForm__input"
                type="number"
                min={2}
                max={100}
                value={form.capacity}
                onChange={(e) => setField("capacity")(e.target.value)}
              />
            </label>
            {form.type === "training" && (
              <label className="eventForm__field">
                Price (optional)
                <input
                  className="eventForm__input"
                  placeholder="e.g. 15 lv / session"
                  value={form.price}
                  onChange={(e) => setField("price")(e.target.value)}
                />
              </label>
            )}
            <label className="eventForm__field eventForm__field--wide">
              Description (optional)
              <textarea
                className="eventForm__input eventForm__textarea"
                value={form.description}
                onChange={(e) => setField("description")(e.target.value)}
              />
            </label>
          </div>
          {formError && <CustomAlert variant="danger" message={formError} />}
          <button type="submit" className="eventForm__submit">
            Publish event
          </button>
        </form>
      )}

      {error && <CustomAlert variant="danger" message={error} />}

      {events.length > 0 ? (
        <div className="eventsPage__grid">
          {events.map((event) => {
            const state = eventCardState(event, me);
            return (
              <article key={event.id} className={state === "cancelled" ? "eventCard eventCard--cancelled" : "eventCard"}>
                <div className="eventCard__top">
                  <span className="eventCard__when">{formatEventDate(event.startsAt)}</span>
                  {event.type === "training" && <span className="eventCard__badge">TRAINER</span>}
                </div>
                <h3 className="eventCard__title">{event.title}</h3>
                <div className="eventCard__chips">
                  <span className="eventCard__chip">{sortedActivities.find((a) => a.key === event.sport)?.label ?? event.sport}</span>
                  {event.price && <span className="eventCard__chip eventCard__chip--price">{event.price}</span>}
                </div>
                <p className="eventCard__where">{event.place ? `${event.place.name} · ${event.place.address}` : event.locationText}</p>
                {event.description && <p className="eventCard__desc">{event.description}</p>}
                <div className="eventCard__meta">
                  <span className="eventCard__host">
                    by {event.host}
                    {event.host !== me && (
                      <button
                        type="button"
                        className="eventCard__msg"
                        onClick={() => navigate("/messages", { state: { receiver: event.host } })}
                      >
                        Message
                      </button>
                    )}
                  </span>
                  <span className="eventCard__slots">
                    {event.participants.length}/{event.capacity} spots
                  </span>
                </div>
                <div className="eventCard__actions">
                  {state === "cancelled" && <span className="eventCard__cancelledLabel">CANCELLED</span>}
                  {state === "host" && (
                    <>
                      <span className="eventCard__hosting">Hosting</span>
                      <button type="button" className="eventCard__cancel" disabled={busyId === event.id} onClick={() => void membership(event.id, "cancel")}>
                        Cancel event
                      </button>
                    </>
                  )}
                  {state === "joined" && (
                    <button type="button" className="eventCard__leave" disabled={busyId === event.id} onClick={() => void membership(event.id, "leave")}>
                      Leave
                    </button>
                  )}
                  {state === "full" && (
                    <button type="button" className="eventCard__join" disabled>
                      Full
                    </button>
                  )}
                  {state === "joinable" && (
                    <button type="button" className="eventCard__join" disabled={busyId === event.id} onClick={() => void membership(event.id, "join")}>
                      Join
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        !error && (
          <div className="eventsPage__empty">
            <Radar size={110} />
            <p>No upcoming events — create the first one</p>
          </div>
        )
      )}
    </div>
  );
}
