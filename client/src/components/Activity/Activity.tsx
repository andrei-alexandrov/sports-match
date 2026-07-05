import type { ClientActivity } from "../../activities/catalogue";
import "./Activity.scss";

interface ActivityComponentProps {
  activity: ClientActivity;
  onAdd?: (activity: ClientActivity) => void;
  added?: boolean;
  onRemove?: (activity: ClientActivity) => void;
  disabled?: boolean;
}

function ActivityComponent({ activity, onAdd, added, disabled }: ActivityComponentProps) {
  return (
    <article className="activityCard">
      <img className="activityCard__img" src={activity.image} alt={activity.label} />
      <div className="activityCard__body">
        <h3 className="activityCard__label">{activity.label}</h3>
        <button
          type="button"
          className={added ? "activityCard__btn activityCard__btn--remove" : "activityCard__btn"}
          onClick={() => onAdd?.(activity)}
          disabled={disabled}
        >
          {added ? "Remove" : "Add"}
        </button>
      </div>
    </article>
  );
}

export { ActivityComponent };
