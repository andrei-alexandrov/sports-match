import React, { useState } from "react";
import { Form, Button } from "react-bootstrap";
import "../components/../LoginAndRegister/LoginAndRegister.scss";
import userManager from "../../services/UserManager";
import { Link, useNavigate } from "react-router-dom";
import CustomAlert from "../../components/CustomAlert/CustomAlert";

const RegistrationForm = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [alert, setAlert] = useState({ show: false, variant: "", message: "" });
  const [formValid, setFormValid] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "username") {
      setUsername(value.trim());
    } else if (name === "password") {
      setPassword(value);
    } else if (name === "confirmPassword") {
      setConfirmPassword(value);
    }
    validateField(name, value);
  };

  const validateField = (name, value) => {
    const newErrors = { ...errors };

    if (name === "username") {
      if (!value) {
        newErrors.username = "Username is required";
      } else if (value.length < 3) {
        newErrors.username = "Username must be at least 3 characters long";
      } else if (/^\d/.test(value)) {
        newErrors.username = "Username cannot start with a number";
      } else if (/^[^a-zA-Z0-9]/.test(value)) {
        newErrors.username = "Username cannot start with a special character";
      } else {
        delete newErrors.username;
      }
    } else if (name === "password") {
      if (!value) {
        newErrors.password = "Password is required";
      } else if (value.length < 6) {
        newErrors.password = "Password must be at least 6 characters long";
      } else if (!/\d/.test(value)) {
        newErrors.password = "Password must contain at least one number";
      } else if (!/[A-Z]/.test(value)) {
        newErrors.password = "Password must contain at least one uppercase letter";
      } else {
        delete newErrors.password;
      }
    } else if (name === "confirmPassword") {
      if (value !== password) {
        newErrors.confirmPassword = "Passwords do not match";
      } else {
        delete newErrors.confirmPassword;
      }
    }
    const usernameValid = !newErrors.username && username;
    const passwordValid = !newErrors.password && password;
    const confirmPasswordValid = !newErrors.confirmPassword && confirmPassword;

    setFormValid(usernameValid && passwordValid && confirmPasswordValid);
    setErrors(newErrors);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (Object.keys(errors).length === 0) {
      const users = JSON.parse(localStorage.getItem("users")) || [];
      if (users.some((user) => user.username === username)) {
        setAlert({ show: true, variant: "danger", message: "Username already taken." });
      } else {
        try {
          await userManager.registerUser(username, password);
          setAlert({ show: true, variant: "success", message: "Registration successful!" });
          setTimeout(() => {
            navigate("/login");
          }, 1000);
        } catch (error) {
          console.error(error);
        }
      }
    } else {
      setErrors(errors);
    }
  };
  return (
    <div className="registerPage">
      <section className="pageHolder">
        <form className="registrationForm" onSubmit={handleSubmit}>
          <h2 className="registerTitle">Register</h2>
          {alert.show && <CustomAlert variant={alert.variant} message={alert.message} />}
          <Form.Group controlId="username">
            <div className="inputBox">
              <span className="icon"><ion-icon name="person"></ion-icon></span>
              <Form.Control
                type="text"
                name="username"
                value={username}
                onChange={handleChange}
                isInvalid={!!errors.username}
                required
              />
              <label>Username</label>
            </div>
          </Form.Group>
          <Form.Control.Feedback className="text-danger" type="invalid">{errors.username}</Form.Control.Feedback>

          <Form.Group controlId="password">
            <div className="inputBox">
              <span className="icon"><ion-icon name="lock-closed"></ion-icon></span>
              <Form.Control
                type="password"
                name="password"
                value={password}
                onChange={handleChange}
                isInvalid={!!errors.password}
                required
              />
              <label>Password</label>
            </div>
          </Form.Group>
          <Form.Control.Feedback className="text-danger" type="invalid">{errors.confirmPassword}</Form.Control.Feedback>

          <Form.Group controlId="confirmPassword">
            <div className="inputBox">
              <span className="icon"><ion-icon name="lock-closed"></ion-icon></span>
              <Form.Control
                type="password"
                name="confirmPassword"
                value={confirmPassword}
                onChange={handleChange}
                isInvalid={!!errors.confirmPassword}
                required
              />
              <label>Confirm Password</label>
            </div>
          </Form.Group>
          <Form.Control.Feedback className="text-danger" type="invalid">{errors.password}</Form.Control.Feedback>

          <span className="btnHolder">
            <Button type="submit" className={`submit-btn ${formValid ? "enabled" : ""}`}>
              Register
            </Button>
            <div className="registerLink">
              <p className="haveAnAcount">Already have an account?
                <Link to="/login"><span className="registerHover"> Log in</span></Link></p>
            </div>
          </span>
        </form>
      </section>
    </div>
  );
}
export default RegistrationForm;
