import type { UpdateProfileInput } from "@sports-match/shared";
import { useState } from "react";
import CustomAlert from "../../components/CustomAlert/CustomAlert";
import { useAuth } from "../../context/AuthContext";
import userImage from "../../images/user.png";
import "../../sweetalert2-custom.scss";
import "./Profile.scss";
import { activityByKey } from "../../activities/catalogue";
import ConfirmModal from "../../components/Modals/ConfirmModal";

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<UpdateProfileInput>({});
  const [error, setError] = useState("");
  const [savingActivities, setSavingActivities] = useState(false);

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
    if (savingActivities) {
      return; // one update at a time — a second confirm would race the first PATCH
    }
    const shouldRemove = await ConfirmModal(
      "Do you really want to remove this activity?",
      "This action cannot be undone.",
    );
    if (!shouldRemove) {
      return;
    }
    setSavingActivities(true);
    try {
      const next = user.activities.filter((key) => key !== activityKey);
      // user.activities is string[] on the wire but only ever holds server-validated catalogue keys.
      await updateProfile({ activities: next as UpdateProfileInput["activities"] });
      setError("");
    } catch {
      setError("Could not update your activities. Please try again.");
    } finally {
      setSavingActivities(false);
    }
  };

  const displayedImage = (isEditing ? draft.image : user.image) || userImage;

  return (
    <div className="profilePage">
      <section className="profileCard">
        <div className="profileCard__header">
          <label
            className="profileCard__avatarWrap"
            title="Change photo"
            onClick={() => {
              if (!isEditing) {
                startEditing();
              }
            }}
          >
            <img className="profileCard__avatar orbit-halo" src={displayedImage} alt="Profile" />
            <span className="profileCard__avatarHint">Change</span>
            <input type="file" accept="image/*" onChange={handleImageChange} hidden />
          </label>
          <div>
            <h1 className="profileCard__name">{user.username}</h1>
            <p className="profileCard__meta">{user.city || "Add your city"}</p>
          </div>
        </div>
        <div className="profileCard__fields">
          <label className="profileCard__label" htmlFor="city">City</label>
          <div className="profileCard__row">
            <input
              id="city"
              name="city"
              className="profileCard__input"
              value={draft.city ?? ""}
              onChange={handleEdit}
              placeholder="Edit your location"
            />
            <button type="button" className="profileCard__save" onClick={handleSave}>
              Save
            </button>
          </div>
          {error && <CustomAlert variant="danger" message={error} />}
        </div>
      </section>

      <section className="profileCard">
        <h2 className="profileCard__sectionTitle">My sports</h2>
        {user.activities.length > 0 ? (
          <div className="profileChips">
            {user.activities.map((key) => {
              const activity = activityByKey(key);
              return activity ? (
                <span className="profileChip" key={key}>
                  <img className="profileChip__img" src={activity.image} alt="" />
                  {activity.label}
                  <button
                    type="button"
                    className="profileChip__remove"
                    aria-label={`Remove ${activity.label}`}
                    onClick={() => handleRemoveActivity(key)}
                    disabled={savingActivities}
                  >
                    ✕
                  </button>
                </span>
              ) : null;
            })}
          </div>
        ) : (
          <p className="profileCard__empty">No sports yet — add some from the Activities page.</p>
        )}
      </section>
    </div>
  );
}
