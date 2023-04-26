import React, { useState, useEffect } from "react";
import { Form, Button } from "react-bootstrap";
import "../components/../LoginAndRegister/LoginAndRegister.scss";
import userManager from "../../services/UserManager";
import { Link, useNavigate } from "react-router-dom";
import { } from "https://unpkg.com/ionicons@5.5.2/dist/ionicons/ionicons.esm.js"

function LoginForm() {

  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [formValid, setFormValid] = useState(false);

  const handleChange = (e) => {
    if (e.target.name === "username") {
      setUsername(e.target.value.trim());
    } else if (e.target.name === "password") {
      setPassword(e.target.value);
    }
  };

  const handleLogin = () => {
    return userManager.loginUser(username, password);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await handleLogin();
      navigate("/home");
    } catch (err) {
      setErrors({ general: err.message });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    const user = userManager.getLoggedInUser();
    setCurrentUser(user);
  }, []);

  useEffect(() => {
    const errorsCopy = { ...errors };
    let formIsValid = true;

    if (username.trim() === "") {
      errorsCopy.username = "Username is required";
      formIsValid = false;
    } else {
      delete errorsCopy.username;
    }

    if (password === "") {
      errorsCopy.password = "Password is required";
      formIsValid = false;
    } else if (!/\d/.test(password)) {
      errorsCopy.password = "Password must contain at least one number";
      formIsValid = false;
    } else {
      delete errorsCopy.password;
    }

    setErrors(errorsCopy);
    setFormValid(formIsValid);
  }, [username, password]);

  return (
    <div className="loginPage">
      <section className="loginPageHolder">
        <form className="loginForm" onSubmit={handleSubmit}>
          <h2>Login</h2>
          <div className="inputBox">
            <span className="icon"><ion-icon name="person"></ion-icon></span>
            <input type="text" name="username" value={username} required onChange={handleChange}></input>
            <label>Username</label>
          </div>

          <div className="inputBox">
            <span className="icon"><ion-icon name="lock-closed"></ion-icon></span>
            <input type="password" name="password" value={password} required onChange={handleChange}></input>
            <label>Password</label>
          </div>

          <Form.Control.Feedback className="text-danger" type="invalid">{errors.general}</Form.Control.Feedback>

          <span className="btnHolder">
          <Button type="submit" className={`submit-btn ${formValid ? "enabled" : ""}`}>
              Login
            </Button>
            <div className="registerLink">
              <p className="haveAnAcount">Don"t have an account?
                <Link to="/register"> <span className="registerHover">Sign up</span></Link></p>
            </div>
          </span>
        </form>
      </section>
    </div>
  );
}

export default LoginForm;
