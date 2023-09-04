import React, { useState } from "react";
import { Form, Button } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import userManager from "../../services/UserManager";
import CustomAlert from "../../components/CustomAlert/CustomAlert";
import { } from "https://unpkg.com/ionicons@5.5.2/dist/ionicons/ionicons.esm.js"

import "../components/../LoginAndRegister/LoginAndRegister.scss";

function LoginForm() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [alert, setAlert] = useState({ show: false, variant: "", message: "" });
  const [formValid, setFormValid] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "username") {
      setUsername(value.trim());
    } else if (name === "password") {
      setPassword(value);
    }
    validateField(name, value);
  };

  const validateField = (name, value) => {
    if (name === "username") {
      setFormValid(value !== "" && password !== "");
    } else if (name === "password") {
      setFormValid(username !== "" && value !== "");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formValid) {
      return;
    }
    try {
      await userManager.loginUser(username, password);
      setSuccess(true);
      setAlert({ show: true, variant: "success", message: "Login successful!" });
      setTimeout(() => {
        navigate("/");
      }, 1000);
    } catch (error) {
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
              <Form.Control
                type="text"
                name="username"
                value={username}
                onChange={handleChange}
                required
              />
              <Form.Label>Username</Form.Label>

            </div>
          </Form.Group>

          <Form.Group controlId="password">
            <div className="inputBox">
              <span className="icon"><ion-icon name="lock-closed"></ion-icon></span>
              <Form.Control
                type="password"
                name="password"
                value={password}
                onChange={handleChange}
                required
              />
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