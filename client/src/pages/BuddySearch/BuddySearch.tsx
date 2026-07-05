import type { PublicUser } from "@sports-match/shared";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CLIENT_ACTIVITIES } from "../../activities/catalogue";
import * as usersApi from "../../api/users";
import BuddyCard from "../../components/BuddyCard/BuddyCard";
import CustomAlert from "../../components/CustomAlert/CustomAlert";
import Radar from "../../components/Orbit/Radar";
import useDebounce from "../../components/Utils/Debounce";
import { useAuth } from "../../context/AuthContext";
import userImage from "../../images/user.png";
import "./BuddySearch.scss";

const sortedActivities = [...CLIENT_ACTIVITIES].sort((a, b) => a.label.localeCompare(b.label));

export default function BuddySearchPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedActivity, setSelectedActivity] = useState("");
  // Safe: this route renders inside RequireAuth, which blocks until the auth check resolves.
  const [city, setCity] = useState(user?.city ?? "");
  const [buddies, setBuddies] = useState<PublicUser[]>([]);
  const [error, setError] = useState("");
  const debouncedCity = useDebounce(city, 300);

  useEffect(() => {
    let cancelled = false;
    usersApi
      .searchUsers({
        // Select options come from the catalogue, so the value is a valid key or "".
        activity: (selectedActivity || undefined) as usersApi.SearchUsersParams["activity"],
        city: debouncedCity.trim() || undefined,
      })
      .then((results) => {
        if (!cancelled) {
          setBuddies(results);
          setError("");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBuddies([]);
          setError("Could not load buddies. Please try again.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedActivity, debouncedCity]);

  const handleStartChat = (otherUser: PublicUser) => {
    navigate("/messages", { state: { receiver: otherUser.username } });
  };

  return (
    <div className="buddyPage">
      <header className="buddyPage__head">
        <h1 className="buddyPage__title">Find a buddy</h1>
        <p className="buddyPage__subtitle">People who share your sport, in your city</p>
      </header>
      <div className="buddyPage__filters">
        <select
          className="buddyPage__select"
          id="activity-select"
          value={selectedActivity}
          onChange={(e) => setSelectedActivity(e.target.value)}
        >
          <option value="">All sports</option>
          {sortedActivities.map((activity) => (
            <option key={activity.key} value={activity.key}>
              {activity.label}
            </option>
          ))}
        </select>
        <input
          className="buddyPage__input"
          type="text"
          value={city}
          placeholder="City"
          onChange={(e) => setCity(e.target.value)}
        />
        <span className="buddyPage__count">{buddies.length} found</span>
      </div>
      {error && <CustomAlert variant="danger" message={error} />}
      <div className="buddyPage__grid">
        {buddies.length === 0 && !error ? (
          <div className="buddyPage__empty">
            <Radar size={110}>
              <span className="buddyPage__emptyDot" />
            </Radar>
            <p>No buddies found — try another sport or city</p>
          </div>
        ) : (
          buddies.map((buddy) => (
            <BuddyCard key={buddy.username} user={buddy} defaultImage={userImage} onStartChat={handleStartChat} />
          ))
        )}
      </div>
    </div>
  );
}
