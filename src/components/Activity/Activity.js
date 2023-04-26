import "./Activity.scss";

function ActivityComponent({ activity, onAdd, added, onRemove }) {
  const addButtonText = added ? "Remove" : "Add";
  const removeButtonText = "X";

  return (
    <div className="activityContainerSquare">
      <h2>{activity.name}</h2>
      <img src={activity.image} alt={activity.name} />
      {onAdd && <button className={added ? "addedButton" : "addButton"} onClick={() => onAdd(activity)}>{addButtonText}</button>}
      {onRemove && <button className="removeButton" onClick={() => onRemove(activity)}>{removeButtonText}</button>}
    </div>
  );
}

function ActivityComponentCircle({ activity, onRemove }) {
  const removeButtonText = "X";
  return (
    <div className="activityContainerCircle">
      {onRemove && <button className="smallBtn" onClick={() => onRemove(activity)}>{removeButtonText}</button>}
      <img src={activity.image} alt={activity.name} />
    </div>
  );
}
export { ActivityComponent, ActivityComponentCircle };
