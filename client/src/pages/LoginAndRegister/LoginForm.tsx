import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import CustomAlert from "../../components/CustomAlert/CustomAlert";
import Radar from "../../components/Orbit/Radar";
import { useAuth } from "../../context/AuthContext";
import "./LoginAndRegister.scss";

interface AlertState {
  show: boolean;
  variant: "success" | "danger";
  message: string;
}

function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [alert, setAlert] = useState<AlertState>({ show: false, variant: "success", message: "" });

  const from = (location.state as { from?: string } | null)?.from ?? "/home";
  const formValid = username !== "" && password !== "";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "username") {
      setUsername(value.trim());
    } else if (name === "password") {
      setPassword(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValid) {
      return;
    }
    try {
      await login({ username, password });
      setAlert({ show: true, variant: "success", message: "Login successful!" });
      setTimeout(() => {
        navigate(from);
      }, 1000);
    } catch {
      setAlert({ show: true, variant: "danger", message: "Invalid username or password." });
    }
  };

  return (
    <div className="authPage">
      <div className="authPage__decor" aria-hidden="true">
        <Radar size={220} sweep={false} />
      </div>
      <form className="authCard" onSubmit={handleSubmit}>
        <span className="authCard__mark" aria-hidden="true" />
        <h1 className="authCard__title">Welcome back</h1>
        <p className="authCard__subtitle">Log in to find your next game</p>
        {alert.show && <CustomAlert variant={alert.variant} message={alert.message} />}
        <label className="authCard__label" htmlFor="username">
          Username
        </label>
        <input
          id="username"
          className="authCard__input"
          type="text"
          name="username"
          value={username}
          onChange={handleChange}
          autoComplete="username"
          required
        />
        <label className="authCard__label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          className="authCard__input"
          type="password"
          name="password"
          value={password}
          onChange={handleChange}
          autoComplete="current-password"
          required
        />
        <button type="submit" className="authCard__submit" disabled={!formValid}>
          Log in
        </button>
        <p className="authCard__switch">
          Don&apos;t have an account? <Link to="/register">Sign up</Link>
        </p>
      </form>
    </div>
  );
}

export default LoginForm;
