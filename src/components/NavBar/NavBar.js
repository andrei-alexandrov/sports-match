import React from "react";
import "../NavBar/NavBar.scss";
import "../../index.scss";
import { Link, Route, Routes, Navigate, useNavigate } from "react-router-dom";
import HomePage from "../../pages/Home/Home";
import ProfilePage from "../../pages/Profile/Profile";
import ActivitiesPage from "../../pages/Activities/Activities";
import BuddySearchPage from "../../pages/BuddySearch/BuddySearch";
import MessagesPage from "../../pages/Messages/Messages";
import PlacesPage from "../../pages/Places/Places";
import LoginForm from "../../pages/LoginAndRegister/LoginForm";
import RegistrationForm from "../../pages/LoginAndRegister/RegistrationForm";
import { useLocation } from "react-router-dom";
import userManager from "../../services/UserManager";
import errorpic from "../../images/errorPage.gif";
import ConfirmModal from "../../components/Modals/ConfirmModal";

function NavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const hideNav = location.pathname === "/home" || location.pathname === "/login" || location.pathname === "/register";
  const loggedInUser = userManager.getLoggedInUser();

  const handleLogout = async () => {
    const isConfirmed = await ConfirmModal("Logout", "Are you sure you want to logout?");
    if (isConfirmed) {
      userManager.logoutUser().then(() => {
        navigate("/login");
      });
    }
  };

  return (
    <>
      {hideNav ? null : (
        <nav className="navbar">
          <ul className="nav-links">
            <li><Link to="/home">Home</Link></li>
            <li><Link to="/profile">My profile</Link></li>
            <li><Link to="/activities">Activities</Link></li>
            <li><Link to="/buddySearch">Buddy Search</Link></li>
            <li><Link to="/messages">Messages</Link></li>
            <li><Link to="/places">Places</Link></li>
            {loggedInUser && (
              <div className="logoutContainer">
                <button className="lougOutBtnHeader" onClick={handleLogout}>Logout</button>
              </div>
            )}
          </ul>
        </nav>
      )}

      <Routes>
        <Route index element={<Navigate to={"/home"} />} />
        <Route path="/register" element={<RegistrationForm />} />
        <Route path="/login" element={<LoginForm />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/activities" element={<ActivitiesPage />} />
        <Route path="/buddySearch" element={<BuddySearchPage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/places" element={<PlacesPage />} />
        <Route path="*" element={<><h2 style={{ color: "white", display: "flex", justifyContent: "center" }}>Page not found. You've taken a wrong turn, but you found a hedgehog.</h2>
          <div className="errorImage">
            <img width={650} src={errorpic} alt="errorImage"></img></div></>} />
      </Routes>
    </>
  );
}

export default NavBar;