import React, { useState, useEffect } from "react";
import userManager from "../../services/UserManager";
import { ActivityComponentCircle } from "../../components/Activity/Activity";
import "./Profile.scss";
import { useNavigate } from "react-router-dom";
import userImage from "../../images/user.png";
import "../../sweetalert2-custom.scss";
import ConfirmModal from "../../components/Modals/ConfirmModal";
import LoginModal from "../../components/Modals/LoginModal";

export default function ProfilePage() {
  const [user, setUser] = useState(userManager.getLoggedInUser());
  const [isEditing, setIsEditing] = useState(false);
  const [profileImage, setProfileImage] = useState(userImage);
  const navigate = useNavigate();

  useEffect(() => {
    const checkLoggedInUser = async () => {
      if (!loggedInUser) {
        const isLoggedIn = await LoginModal();
        if (!isLoggedIn) {
          navigate('/home', { state: { from: '/profile' } });
          return;
        }
        navigate('/login', { state: { from: '/profile' } });
      }
      const userImage = loggedInUser?.image || profileImage;
      setProfileImage(userImage);
      setUser({ ...loggedInUser });
    };
    checkLoggedInUser();
  }, []);

  const loggedInUser = userManager.getLoggedInUser();
  if (!loggedInUser) {
    return;
  }
  const handleRemoveActivity = async (activity) => {
    const shouldRemove = await ConfirmModal(
      'Do you really want to remove this activity?',
      'This action cannot be undone.'
    );

    if (shouldRemove) {
      const newUser = userManager.getLoggedInUser();
      userManager.removeActivity(activity);
      const updatedUser = { ...newUser };
      updatedUser.activities = updatedUser.activities.filter((a) => a !== activity);
      setUser(updatedUser);
    }
  };

  const handleEdit = (event) => {
    let value = event.target.value;
    if (event.target.name === "age") {
      value = Math.max(0, Math.min(value, 100));
    } else if (event.target.name === "city" && !isNaN(value)) {
      value = "";
    }
    setUser({
      ...user,
      [event.target.name]:
        event.target.type === "number" ? parseInt(value) : value.trim(),
    });
    if (event.target.name === "gender") {
      setUser({ ...user, gender: value });
    }
  };

  const handleSave = () => {
    userManager.setLoggedInUser(user);
    setIsEditing(false);
  };

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfileImage(reader.result);
      const loggedInUser = userManager.getLoggedInUser();
      if (loggedInUser) {
        loggedInUser.image = reader.result;
        userManager.saveUserData();
      }
      setUser({ ...loggedInUser });
    };
    if (file) {
      reader.readAsDataURL(file);
    } else {
      setProfileImage(userImage);
      const loggedInUser = userManager.getLoggedInUser();
      if (loggedInUser) {
        loggedInUser.image = "";
        userManager.saveUserData();
      }
      setUser({ ...loggedInUser });
    }
  };

  return (
    <div className="profilePageContainer">
      <div className="profileInfo">
        <div className="profileImage">
          <img src={user && user.profilePic ? user.profilePic : profileImage} alt={user && user.username ? user.username : ''} />
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
              <ion-icon name="accessibility-outline"></ion-icon>{' '}
              {user.username}
            </span>
          </h2>
          <p>
            <span className="icon">
              <ion-icon name="calendar-outline"></ion-icon>{' '}
              {isEditing ? (
                <input style={{ position: "relative" }} type="number" name="age" value={user.age || ''} onChange={handleEdit} placeholder="Edit your age" />
              ) : (
                <>{typeof user.age === 'number' ? user.age : ''}</>
              )}
            </span>
          </p>
          <p>
            <span className="icon">
              <ion-icon name="location-outline"></ion-icon> {' '}
            </span>
            {isEditing ? (
              <input type="text" name="city" value={user.city} onChange={handleEdit} placeholder="Edit your location" />
            ) : (
              user.city
            )}
          </p>
          <p>
            <span className="icon">
              <ion-icon name="transgender-outline"></ion-icon>{' '}
            </span>
            {isEditing ? (
              <select style={{ cursor: 'pointer' }} name="gender" value={user.gender} onChange={handleEdit}>
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
          <button onClick={() => setIsEditing(true)}>Edit</button>
        )}
      </div>
      <div>
        <h3>{user.username}'s activities:</h3>
        {user && user.activities && user.activities.length > 0 ? (
          <div className="activitiesList">
            {user.activities.map((activity) => (
              <div key={activity.name}>
                <ActivityComponentCircle activity={activity} onRemove={() => handleRemoveActivity(activity)} className="smallActivity" />
              </div>
            ))}
          </div>
        ) : (
          <p>No activities added yet</p>
        )}
      </div>
    </div >
  );
}
