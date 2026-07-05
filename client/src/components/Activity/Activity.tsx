import type { ClientActivity } from "../../activities/catalogue";
import "./Activity.scss";

interface ActivityComponentProps {
  activity: ClientActivity;
  onAdd?: (activity: ClientActivity) => void;
  added?: boolean;
  onRemove?: (activity: ClientActivity) => void;
  disabled?: boolean;
}

function ActivityComponent({ activity, onAdd, added, onRemove, disabled }: ActivityComponentProps) {
  const addButtonText = added ? "Remove" : "Add";

  return (
    <div className="activityContainerSquare">
      <h2>{activity.label}</h2>
      <img src={activity.image} alt={activity.label} />
      {onAdd && (
        <button className={added ? "addedButton" : "addButton"} onClick={() => onAdd(activity)} disabled={disabled}>
          {addButtonText}
        </button>
      )}
      {onRemove && (
        <button className="removeButton" onClick={() => onRemove(activity)} disabled={disabled}>
          X
        </button>
      )}
    </div>
  );
}

export { ActivityComponent };
