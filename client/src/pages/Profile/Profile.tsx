import type { UpdateProfileInput } from "@sports-match/shared";
import { useState } from "react";
import CustomAlert from "../../components/CustomAlert/CustomAlert";
import { useAuth } from "../../context/AuthContext";
import userImage from "../../images/user.png";
import "../../sweetalert2-custom.scss";
import "./Profile.scss";
import { activityByKey } from "../../activities/catalogue";
import { ActivityComponentCircle } from "../../components/Activity/Activity";
import ConfirmModal from "../../components/Modals/ConfirmModal";

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<UpdateProfileInput>({});
  const [error, setError] = useState("");

  if (!user) {
    return null; // RequireAuth guarantees a user; this narrows the type.
  }

  const startEditing = () => {
    setDraft({ age: user.age, city: user.city, gender: user.gender, image: user.image });
    setIsEditing(true);
  };

  const handleEdit = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    if (name === "age") {
      const parsed = parseInt(value, 10);
      setDraft({ ...draft, age: Number.isNaN(parsed) ? null : Math.max(0, Math.min(parsed, 100)) });
    } else if (name === "city") {
      setDraft({ ...draft, city: value });
    } else if (name === "gender") {
      setDraft({ ...draft, gender: value as UpdateProfileInput["gender"] });
    }
  };

  const handleSave = async () => {
    try {
      await updateProfile(draft);
      setError("");
      setIsEditing(false);
    } catch {
      setError("Could not save your profile. Please try again.");
    }
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setDraft((d) => ({ ...d, image: "" }));
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setDraft((d) => ({ ...d, image: typeof reader.result === "string" ? reader.result : "" }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveActivity = async (activityKey: string) => {
    const shouldRemove = await ConfirmModal(
      "Do you really want to remove this activity?",
      "This action cannot be undone.",
    );
    if (!shouldRemove) {
      return;
    }
    try {
      const next = user.activities.filter((key) => key !== activityKey);
      // user.activities is string[] on the wire but only ever holds server-validated catalogue keys.
      await updateProfile({ activities: next as UpdateProfileInput["activities"] });
      setError("");
    } catch {
      setError("Could not update your activities. Please try again.");
    }
  };

  const displayedImage = (isEditing ? draft.image : user.image) || userImage;

  return (
    <div className="profilePageContainer">
      <div className="profileInfo">
        {error && <CustomAlert variant="danger" message={error} />}
        <div className="profileImage">
          <img src={displayedImage} alt={user.username} />
          {isEditing && (
            <div className="file-input-container">
              <input type="file" name="image" id="file-input" className="file-input" onChange={handleImageChange} accept="image/*" />
              <label htmlFor="file-input" className="file-input-label">Choose File</label>
            </div>
          )}
        </div>
        <div className="userInfo">
          <h2>
            <span className="icon">
              <ion-icon name="accessibility-outline"></ion-icon>{" "}
              {user.username}
            </span>
          </h2>
          <p>
            <span className="icon">
              <ion-icon name="calendar-outline"></ion-icon>{" "}
              {isEditing ? (
                <input style={{ position: "relative" }} type="number" name="age" value={draft.age ?? ""} onChange={handleEdit} placeholder="Edit your age" />
              ) : (
                <>{typeof user.age === "number" ? user.age : ""}</>
              )}
            </span>
          </p>
          <p>
            <span className="icon">
              <ion-icon name="location-outline"></ion-icon>{" "}
            </span>
            {isEditing ? (
              <input type="text" name="city" value={draft.city ?? ""} onChange={handleEdit} placeholder="Edit your location" />
            ) : (
              user.city
            )}
          </p>
          <p>
            <span className="icon">
              <ion-icon name="transgender-outline"></ion-icon>{" "}
            </span>
            {isEditing ? (
              <select style={{ cursor: "pointer" }} name="gender" value={draft.gender ?? ""} onChange={handleEdit}>
                <option value="">Choose gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            ) : (
              user.gender
            )}
          </p>
        </div>
        {isEditing ? (
          <button onClick={handleSave}>Save</button>
        ) : (
          <button onClick={startEditing}>Edit</button>
        )}
      </div>
      <div>
        <h3>{user.username}'s activities:</h3>
        {user.activities.length > 0 ? (
          <div className="activitiesList">
            {user.activities.map((key) => {
              const activity = activityByKey(key);
              return activity ? (
                <div key={key}>
                  <ActivityComponentCircle activity={activity} onRemove={() => handleRemoveActivity(key)} />
                </div>
              ) : null;
            })}
          </div>
        ) : (
          <p>No activities added yet</p>
        )}
      </div>
    </div>
  );
}
