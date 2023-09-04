import React, { useState } from "react";
import { Link, Route, Routes, Navigate, useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { Container, Navbar, Nav, NavDropdown } from "react-bootstrap";

import HomePage from "../../pages/Home/Home";
import ProfilePage from "../../pages/Profile/Profile";
import ActivitiesPage from "../../pages/Activities/Activities";
import BuddySearchPage from "../../pages/BuddySearch/BuddySearch";
import MessagesPage from "../../pages/Messages/Messages";
import PlacesPage from "../../pages/Places/Places";
import LoginForm from "../../pages/LoginAndRegister/LoginForm";
import RegistrationForm from "../../pages/LoginAndRegister/RegistrationForm";
import userManager from "../../services/UserManager";
import errorpic from "../../images/errorPage.gif";
import ConfirmModal from "../../components/Modals/ConfirmModal";

import "./NavBar.scss";
import "../../index.scss";

function NavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const hideNav = location.pathname === "/home" || location.pathname === "/login" || location.pathname === "/register";
  const loggedInUser = userManager.getLoggedInUser();

  const [expanded, setExpanded] = useState(false);

  const handleToggle = () => {
    setExpanded(!expanded);
  };

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
      <Navbar variant="dark" bg="dark">
        <Container>
          {!hideNav && (
            <Navbar.Toggle aria-controls="navbar-nav" onClick={handleToggle} />
          )}
          <Navbar.Collapse id="navbar-nav">
            {!hideNav && (
              <Nav className="mx-auto nav-links d-flex flex-row justify-content-center align-items-center gap-3">
                <Nav.Link as={Link} to="/home">Home</Nav.Link>
                <Nav.Link as={Link} to="/profile">My Profile</Nav.Link>
                <Nav.Link as={Link} to="/activities">Activities</Nav.Link>
                <Nav.Link as={Link} to="/buddySearch">Buddy Search</Nav.Link>
                <Nav.Link as={Link} to="/messages">Messages</Nav.Link>
                <Nav.Link as={Link} to="/places">Places</Nav.Link>
                {loggedInUser ? (
                  <Nav.Item>
                    <NavDropdown.Item onClick={handleLogout}>Logout</NavDropdown.Item>
                  </Nav.Item>
                ) : (
                  <Nav.Item><Nav.Link as={Link} to="/login">Login</Nav.Link></Nav.Item>
                )}
              </Nav>
            )}
          </Navbar.Collapse>
        </Container>
      </Navbar>

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
        <Route path="*" element={<div>
          <h2 style={{ color: "white", display: "flex", justifyContent: "center" }}>Page not found. You've taken a wrong turn, but you found a hedgehog.</h2>
          <div className="errorImage">
            <img width={650} src={errorpic} alt="errorImage" />
          </div>
        </div>} />
      </Routes>
    </>
  );
}

export default NavBar;
