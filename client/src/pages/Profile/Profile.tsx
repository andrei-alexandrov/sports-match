import type { UpdateProfileInput } from "@sports-match/shared";
import { useState, useRef } from "react";
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!user) {
    return null; // RequireAuth guarantees a user; this narrows the type.
  }

  // Used by the avatar click: seeds the whole draft so the photo preview flow keeps
  // its existing behavior unchanged.
  const startEditing = () => {
    setDraft({ age: user.age, city: user.city, gender: user.gender, image: user.image });
    setIsEditing(true);
  };

  // Used by the "Edit profile" button: enters edit mode without seeding draft, so
  // Save stays disabled and the PATCH body stays scoped to fields the user actually
  // touches (see handleSave / the `disabled` rule on the Save button below).
  const openEdit = () => {
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
      setDraft({});
    } catch {
      setError("Could not save your profile. Please try again.");
    }
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setDraft({});
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

  // Not gated on isEditing: opening edit mode via "Edit profile" doesn't seed
  // draft.image, so the avatar must keep showing the saved photo until the file
  // picker (avatar click) actually produces a new draft.image value.
  const displayedImage = (draft.image ?? user.image) || userImage;

  return (
    <div className="profilePage">
      <section className="profileCard">
        <div className="profileCard__header">
          <label
            className="profileCard__avatarWrap"
            title="Change photo"
            role="button"
            tabIndex={0}
            onClick={() => {
              if (!isEditing) {
                startEditing();
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                if (!isEditing) {
                  startEditing();
                }
                fileInputRef.current?.click();
              }
            }}
          >
            <img className="profileCard__avatar orbit-halo" src={displayedImage} alt="Profile" />
            <span className="profileCard__avatarHint">Change</span>
            <input type="file" accept="image/*" onChange={handleImageChange} hidden ref={fileInputRef} />
          </label>
          <div className="profileCard__identity">
            <h1 className="profileCard__name">{user.username}</h1>
            <p className="profileCard__meta">{user.city || "Add your city"}</p>
          </div>
          {!isEditing && (
            <div className="profileCard__actions">
              <button type="button" className="profileCard__editBtn" onClick={openEdit}>
                Edit profile
              </button>
            </div>
          )}
        </div>
        {isEditing ? (
          <div className="profileCard__fields">
            <label className="profileCard__label" htmlFor="city">City</label>
            <div className="profileCard__row">
              <input
                id="city"
                name="city"
                className="profileCard__input"
                value={draft.city ?? user?.city ?? ""}
                onChange={handleEdit}
                placeholder="Edit your location"
              />
            </div>

            <label className="profileCard__label" htmlFor="age">Age</label>
            <div className="profileCard__row">
              <input
                id="age"
                name="age"
                type="number"
                min={0}
                max={100}
                className="profileCard__input"
                value={draft.age === null ? "" : (draft.age ?? user?.age ?? "")}
                onChange={handleEdit}
                placeholder="Edit your age"
              />
            </div>

            <label className="profileCard__label" htmlFor="gender">Gender</label>
            <div className="profileCard__row">
              <select
                id="gender"
                name="gender"
                className="profileCard__select"
                value={draft.gender ?? user?.gender ?? ""}
                onChange={handleEdit}
              >
                <option value="">Choose gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="profileCard__actions">
              <button
                type="button"
                className="profileCard__save"
                onClick={handleSave}
                disabled={Object.keys(draft).length === 0}
              >
                Save
              </button>
              <button type="button" className="profileCard__cancelBtn" onClick={cancelEditing}>
                Cancel
              </button>
            </div>

            {error && <CustomAlert variant="danger" message={error} />}
          </div>
        ) : (
          <div className="profileCard__fields">
            <div className="profileCard__viewRow">
              <span className="profileCard__label">City</span>
              <span className={user.city ? "profileCard__value" : "profileCard__value profileCard__value--empty"}>
                {user.city || "Not set"}
              </span>
            </div>
            <div className="profileCard__viewRow">
              <span className="profileCard__label">Age</span>
              {/* null-aware: age 0 is a set value, unlike "" for the string fields */}
              <span className={user.age != null ? "profileCard__value" : "profileCard__value profileCard__value--empty"}>
                {user.age != null ? user.age : "Not set"}
              </span>
            </div>
            <div className="profileCard__viewRow">
              <span className="profileCard__label">Gender</span>
              <span className={user.gender ? "profileCard__value" : "profileCard__value profileCard__value--empty"}>
                {user.gender || "Not set"}
              </span>
            </div>

            {error && <CustomAlert variant="danger" message={error} />}
          </div>
        )}
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
