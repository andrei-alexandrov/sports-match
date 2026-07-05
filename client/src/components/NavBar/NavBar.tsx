import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import ConfirmModal from "../Modals/ConfirmModal";
import "./NavBar.scss";

const APP_LINKS = [
  { to: "/home", label: "Home" },
  { to: "/profile", label: "Profile" },
  { to: "/activities", label: "Activities" },
  { to: "/buddySearch", label: "Buddies" },
  { to: "/messages", label: "Messages" },
  { to: "/events", label: "Events" },
  { to: "/places", label: "Places" },
];

export default function NavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const publicRoute = ["/home", "/login", "/register", "/"].includes(location.pathname);
  const publicVariant = !user && publicRoute;

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    setMenuOpen(false);
    const isConfirmed = await ConfirmModal("Logout", "Are you sure you want to logout?");
    if (isConfirmed) {
      await logout();
      navigate("/login");
    }
  };

  return (
    <header className="orbitNav">
      <div className="orbitNav__inner">
        <Link to="/home" className="orbitNav__logo" onClick={() => setMenuOpen(false)}>
          <span className="orbitNav__mark" aria-hidden="true" />
          SportsMatch
        </Link>

        {publicVariant ? (
          <nav className="orbitNav__public">
            <Link className="orbitNav__loginLink" to="/login">Log in</Link>
            <Link className="orbitNav__cta" to="/register">Join free</Link>
          </nav>
        ) : (
          <>
            <button
              type="button"
              className="orbitNav__burger"
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span aria-hidden="true" />
              <span aria-hidden="true" />
              <span aria-hidden="true" />
            </button>
            <nav className={menuOpen ? "orbitNav__links orbitNav__links--open" : "orbitNav__links"}>
              {APP_LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) => (isActive ? "orbitNav__link orbitNav__link--active" : "orbitNav__link")}
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </NavLink>
              ))}
              {user ? (
                <button type="button" className="orbitNav__logout" onClick={handleLogout}>
                  Logout
                </button>
              ) : (
                <NavLink to="/login" className="orbitNav__link" onClick={() => setMenuOpen(false)}>
                  Login
                </NavLink>
              )}
            </nav>
            {user && (
              <span className="orbitNav__avatar orbit-halo" title={user.username}>
                {user.image ? <img src={user.image} alt={user.username} /> : user.username.charAt(0).toUpperCase()}
              </span>
            )}
          </>
        )}
      </div>
    </header>
  );
}
