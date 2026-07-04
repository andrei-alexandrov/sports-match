import { useState } from "react";
import { Button, Form } from "react-bootstrap";
import { Link, useLocation, useNavigate } from "react-router-dom";
import CustomAlert from "../../components/CustomAlert/CustomAlert";
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

  // react-bootstrap's Form.Control types onChange against this element union.
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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
    <div className="introPage">
      <section className="pageHolder">
        <form className="loginForm" onSubmit={handleSubmit}>
          <h2 className="loginTitle">Login</h2>
          {alert.show && <CustomAlert variant={alert.variant} message={alert.message} />}
          <Form.Group controlId="username">
            <div className="inputBox">
              <span className="icon"><ion-icon name="person"></ion-icon></span>
              <Form.Control type="text" name="username" value={username} onChange={handleChange} required />
              <Form.Label>Username</Form.Label>
            </div>
          </Form.Group>

          <Form.Group controlId="password">
            <div className="inputBox">
              <span className="icon"><ion-icon name="lock-closed"></ion-icon></span>
              <Form.Control type="password" name="password" value={password} onChange={handleChange} required />
              <Form.Label>Password</Form.Label>
            </div>
          </Form.Group>
          <span className="btnHolder">
            <Button type="submit" className={`submit-btn ${formValid ? "enabled" : ""}`}>
              Login
            </Button>
            <div className="registerLink">
              <p className="have-account">Don't have an account?
                <Link to="/register"><span className="registerHover"> Sign up</span></Link></p>
            </div>
          </span>
        </form>
      </section>
    </div>
  );
}

export default LoginForm;
