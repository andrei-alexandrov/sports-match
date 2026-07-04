import type { ClientActivity } from "../../activities/catalogue";
import "./Activity.scss";

interface ActivityComponentProps {
  activity: ClientActivity;
  onAdd?: (activity: ClientActivity) => void;
  added?: boolean;
  onRemove?: (activity: ClientActivity) => void;
}

function ActivityComponent({ activity, onAdd, added, onRemove }: ActivityComponentProps) {
  const addButtonText = added ? "Remove" : "Add";

  return (
    <div className="activityContainerSquare">
      <h2>{activity.label}</h2>
      <img src={activity.image} alt={activity.label} />
      {onAdd && (
        <button className={added ? "addedButton" : "addButton"} onClick={() => onAdd(activity)}>
          {addButtonText}
        </button>
      )}
      {onRemove && (
        <button className="removeButton" onClick={() => onRemove(activity)}>
          X
        </button>
      )}
    </div>
  );
}

interface ActivityComponentCircleProps {
  activity: ClientActivity;
  onRemove?: (activity: ClientActivity) => void;
}

function ActivityComponentCircle({ activity, onRemove }: ActivityComponentCircleProps) {
  return (
    <div className="activityContainerCircle">
      {onRemove && (
        <button className="smallBtn" onClick={() => onRemove(activity)}>
          X
        </button>
      )}
      <img src={activity.image} alt={activity.label} />
    </div>
  );
}

export { ActivityComponent, ActivityComponentCircle };
