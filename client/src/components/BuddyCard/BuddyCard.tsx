import type { PublicUser } from "@sports-match/shared";
import { activityByKey } from "../../activities/catalogue";
import "./BuddyCard.scss";

interface BuddyCardProps {
  user: PublicUser;
  defaultImage: string;
  onStartChat: (user: PublicUser) => void;
}

export default function BuddyCard({ user, defaultImage, onStartChat }: BuddyCardProps) {
  const activityLabels = user.activities.map((key) => activityByKey(key)?.label ?? key).join(", ");

  return (
    <div className="box">
      <div className="imgBx">
        <img src={user.image || defaultImage} alt={user.username} />
      </div>
      <div className="content">
        <h3>
          {user.username} <br></br>
          <span>
            Favourite activities: {activityLabels} <br></br>
          </span>
          <button className="chatBtn" onClick={() => onStartChat(user)}>
            Start Chat
          </button>
        </h3>
      </div>
    </div>
  );
}
