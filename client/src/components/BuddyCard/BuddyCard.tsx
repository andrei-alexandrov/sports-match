import type { PublicUser } from "@sports-match/shared";
import { activityByKey } from "../../activities/catalogue";
import "./BuddyCard.scss";

interface BuddyCardProps {
  user: PublicUser;
  defaultImage: string;
  onStartChat: (user: PublicUser) => void;
}

export default function BuddyCard({ user, defaultImage, onStartChat }: BuddyCardProps) {
  const visibleActivities = user.activities.slice(0, 3);
  const extraCount = user.activities.length - visibleActivities.length;

  return (
    <article className="buddyCard">
      <img
        className="buddyCard__avatar orbit-halo"
        src={user.image || defaultImage}
        alt={user.username}
      />
      <h3 className="buddyCard__name">{user.username}</h3>
      <div className="buddyCard__tags">
        {visibleActivities.map((key) => (
          <span className="buddyCard__tag" key={key}>
            {activityByKey(key)?.label ?? key}
          </span>
        ))}
        {extraCount > 0 && <span className="buddyCard__tag">{`+${extraCount}`}</span>}
      </div>
      <button type="button" className="buddyCard__cta" onClick={() => onStartChat(user)}>
        Message
      </button>
    </article>
  );
}
