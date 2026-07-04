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
  const debouncedSearchInput = useDebounce(searchInput, 300);

  if (!user) {
    return null; // RequireAuth guarantees a user; this narrows the type.
  }

  const addedKeys = new Set(user.activities);

  const handleToggleActivity = async (activity: ClientActivity) => {
    const next = addedKeys.has(activity.key)
      ? user.activities.filter((key) => key !== activity.key)
      : [...user.activities, activity.key];
    try {
      // user.activities is string[] on the wire but only ever holds server-validated catalogue keys.
      await updateProfile({ activities: next as UpdateProfileInput["activities"] });
      setError("");
    } catch {
      setError("Could not update your activities. Please try again.");
    }
  };

  return (
    <div className="activitiesPageContainer">
      <div className="titleWrapper">
        <h2 className="siteNameTitle">
          ADD favorite sports to your profile so that other people can find you
        </h2>
      </div>
      {error && <CustomAlert variant="danger" message={error} />}
      <div className="searchContainer">
        <label htmlFor="activitySearch"></label>
        <input
          id="activitySearch"
          type="text"
          value={searchInput}
          placeholder="Search for sport"
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>
      <div className="activitiesContainer">
        {sortedActivities
          .filter((activity) => activity.label.toLowerCase().includes(debouncedSearchInput.toLowerCase()))
          .map((activity) => (
            <ActivityComponent
              key={activity.key}
              activity={activity}
              onAdd={handleToggleActivity}
              added={addedKeys.has(activity.key)}
            />
          ))}
      </div>
    </div>
  );
}
