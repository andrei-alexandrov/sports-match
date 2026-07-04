import { useState } from "react";
import { Container, Nav, NavDropdown, Navbar } from "react-bootstrap";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import ConfirmModal from "../Modals/ConfirmModal";
import "./NavBar.scss";

function NavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const hideNav =
    location.pathname === "/home" || location.pathname === "/login" || location.pathname === "/register";

  const [expanded, setExpanded] = useState(false);

  const handleToggle = () => {
    setExpanded(!expanded);
  };

  const handleLogout = async () => {
    const isConfirmed = await ConfirmModal("Logout", "Are you sure you want to logout?");
    if (isConfirmed) {
      await logout();
      navigate("/login");
    }
  };

  return (
    <Navbar variant="dark" bg="dark">
      <Container>
        {!hideNav && <Navbar.Toggle aria-controls="navbar-nav" onClick={handleToggle} />}
        <Navbar.Collapse id="navbar-nav">
          {!hideNav && (
            <Nav className="mx-auto nav-links d-flex flex-row justify-content-center align-items-center gap-3">
              <Nav.Link as={Link} to="/home">Home</Nav.Link>
              <Nav.Link as={Link} to="/profile">My Profile</Nav.Link>
              <Nav.Link as={Link} to="/activities">Activities</Nav.Link>
              <Nav.Link as={Link} to="/buddySearch">Buddy Search</Nav.Link>
              <Nav.Link as={Link} to="/messages">Messages</Nav.Link>
              <Nav.Link as={Link} to="/places">Places</Nav.Link>
              {user ? (
                <Nav.Item>
                  <NavDropdown.Item onClick={handleLogout}>Logout</NavDropdown.Item>
                </Nav.Item>
              ) : (
                <Nav.Item>
                  <Nav.Link as={Link} to="/login">Login</Nav.Link>
                </Nav.Item>
              )}
            </Nav>
          )}
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default NavBar;
