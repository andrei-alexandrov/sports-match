import type { UpdateProfileInput } from "@sports-match/shared";
import { useState } from "react";
import { CLIENT_ACTIVITIES, type ClientActivity } from "../../activities/catalogue";
import { ActivityComponent } from "../../components/Activity/Activity";
import CustomAlert from "../../components/CustomAlert/CustomAlert";
import useDebounce from "../../components/Utils/Debounce";
import { useAuth } from "../../context/AuthContext";
import "../../sweetalert2-custom.scss";
import "./Activities.scss";

const sortedActivities = [...CLIENT_ACTIVITIES].sort((a, b) => a.label.localeCompare(b.label));

export default function ActivitiesPage() {
  const { user, updateProfile } = useAuth();
  const [searchInput, setSearchInput] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const debouncedSearchInput = useDebounce(searchInput, 300);

  if (!user) {
    return null; // RequireAuth guarantees a user; this narrows the type.
  }

  const addedKeys = new Set(user.activities);

  const handleToggleActivity = async (activity: ClientActivity) => {
    if (saving) {
      return; // one update at a time — a second click would race the first PATCH
    }
    const next = addedKeys.has(activity.key)
      ? user.activities.filter((key) => key !== activity.key)
      : [...user.activities, activity.key];
    setSaving(true);
    try {
      // user.activities is string[] on the wire but only ever holds server-validated catalogue keys.
      await updateProfile({ activities: next as UpdateProfileInput["activities"] });
      setError("");
    } catch {
      setError("Could not update your activities. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="activitiesPage">
      <header className="activitiesPage__head">
        <h1 className="activitiesPage__title">Activities</h1>
        <p className="activitiesPage__subtitle">Pick the sports you play — they power your buddy matches</p>
        <input
          className="activitiesPage__search"
          type="text"
          placeholder="Search sports"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </header>
      {error && <CustomAlert variant="danger" message={error} />}
      <div className="activitiesPage__grid">
        {sortedActivities
          .filter((activity) => activity.label.toLowerCase().includes(debouncedSearchInput.toLowerCase()))
          .map((activity) => (
            <ActivityComponent
              key={activity.key}
              activity={activity}
              onAdd={handleToggleActivity}
              added={addedKeys.has(activity.key)}
              disabled={saving}
            />
          ))}
      </div>
    </div>
  );
}
