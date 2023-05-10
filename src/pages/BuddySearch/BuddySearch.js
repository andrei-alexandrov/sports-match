import React, { useState, useEffect } from "react";
import userManager from "../../services/UserManager";
import "./BuddySearch.scss";
import { useNavigate } from "react-router-dom";
import userImage from "../../images/user.png";
import BuddyCard from "../../components/BuddyCard/BuddyCard";
import activitiesData from "../Activities/activitiesData";
import LoginModal from "../../components/Modals/LoginModal";

export default function BuddySearchPage() {
  const [users, setUsers] = useState(userManager.users);
  const [selectedValue, setSelectedValue] = useState("");
  const navigate = useNavigate();
  const loggedInUser = userManager.getLoggedInUser();

  useEffect(() => {
    const checkLoggedInUser = async () => {
      if (!loggedInUser) {
        const isLoggedIn = await LoginModal();
        if (!isLoggedIn) {
          navigate('/home', { state: { from: '/buddySearch' } });
          return;
        }
        navigate('/login', { state: { from: '/buddySearch' } });
      }
      setUsers(userManager.users);
    };

    checkLoggedInUser();
  }, []);

  useEffect(() => {
    setUsers(userManager.users);
  }, [userManager.getLoggedInUser()?.activities]);


  const handleChange = async (event) => {
    setSelectedValue(event.target.value);
    const updatedUsers = userManager.fetchAllUsers();
    setUsers(updatedUsers);
  };

  const filteredUsers = users.filter(
    (user) =>
      user.username !== userManager.getLoggedInUser()?.username &&
      user.activities.some((activity) => activity.name === selectedValue)
  );

  const handleStartChat = (otherUser) => { navigate('/messages', { state: { receiver: otherUser.username } }); }

  return (
    <div className="buddyPage">
      <h2 className="siteSloganTitle">Find someone that shares your sport passion</h2>
      <div className="buddySearchWrapper">
        <select className='buddySearchSelect' id="activity-select" value={selectedValue} onChange={handleChange}>
          <option value="">Search buddy by activity</option>
          {activitiesData.sort((a, b) => a.name.localeCompare(b.name)).map((activity) => (
            <option key={activity.name} value={activity.name}>
              {activity.name}
            </option>
          ))}
        </select>
      </div>
      <div className="buddiesHolder">
        {filteredUsers.map((user) => (
          <div className="buddyCardContainer" key={user.username}>
            <BuddyCard user={user} defaultImage={userImage} onStartChat={() => handleStartChat(user)} />
          </div>
        ))}
      </div>
    </div>
  );
}
