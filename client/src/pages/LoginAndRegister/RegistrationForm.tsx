import { registerInputSchema } from "@sports-match/shared";
import { useState } from "react";
import { Button, Form } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../../api/http";
import CustomAlert from "../../components/CustomAlert/CustomAlert";
import { useAuth } from "../../context/AuthContext";
import "./LoginAndRegister.scss";

interface FieldErrors {
  username?: string;
  password?: string;
  confirmPassword?: string;
}

interface AlertState {
  show: boolean;
  variant: "success" | "danger";
  message: string;
}

function firstIssue(result: { success: boolean; error?: { issues: { message: string }[] } }): string | undefined {
  return result.success ? undefined : result.error?.issues[0]?.message;
}

const RegistrationForm = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [alert, setAlert] = useState<AlertState>({ show: false, variant: "success", message: "" });
  const { register } = useAuth();
  const navigate = useNavigate();

  const formValid =
    username !== "" &&
    password !== "" &&
    confirmPassword === password &&
    !errors.username &&
    !errors.password &&
    !errors.confirmPassword;

  // react-bootstrap's Form.Control types onChange against this element union.
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const newErrors: FieldErrors = { ...errors };
    if (name === "username") {
      const trimmed = value.trim();
      setUsername(trimmed);
      newErrors.username = firstIssue(registerInputSchema.shape.username.safeParse(trimmed));
    } else if (name === "password") {
      setPassword(value);
      newErrors.password = firstIssue(registerInputSchema.shape.password.safeParse(value));
      newErrors.confirmPassword = confirmPassword !== value && confirmPassword !== "" ? "Passwords do not match" : undefined;
    } else if (name === "confirmPassword") {
      setConfirmPassword(value);
      newErrors.confirmPassword = value !== password && value !== "" ? "Passwords do not match" : undefined;
    }
    setErrors(newErrors);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValid) {
      return;
    }
    try {
      await register({ username, password });
      setAlert({ show: true, variant: "success", message: "Registration successful!" });
      setTimeout(() => {
        navigate("/home");
      }, 1000);
    } catch (error) {
      const message =
        error instanceof ApiError && error.code === "USERNAME_TAKEN"
          ? "Username already taken."
          : error instanceof ApiError
            ? error.message
            : "Something went wrong. Please try again.";
      setAlert({ show: true, variant: "danger", message });
    }
  };

  return (
    <div className="introPage">
      <section className="pageHolder">
        <Form className="registrationForm" onSubmit={handleSubmit}>
          <h2 className="registerTitle">Register</h2>
          {alert.show && <CustomAlert variant={alert.variant} message={alert.message} />}
          <Form.Group controlId="username">
            <div className="inputBox">
              <span className="icon"><ion-icon name="person"></ion-icon></span>
              <Form.Control type="text" name="username" value={username} onChange={handleChange} isInvalid={!!errors.username} required />
              <label>Username</label>
            </div>
          </Form.Group>
          <Form.Control.Feedback className="text-danger" type="invalid">{errors.username}</Form.Control.Feedback>

          <Form.Group controlId="password">
            <div className="inputBox">
              <span className="icon"><ion-icon name="lock-closed"></ion-icon></span>
              <Form.Control type="password" name="password" value={password} onChange={handleChange} isInvalid={!!errors.password} required />
              <label>Password</label>
            </div>
          </Form.Group>
          <Form.Control.Feedback className="text-danger" type="invalid">{errors.password}</Form.Control.Feedback>

          <Form.Group controlId="confirmPassword">
            <div className="inputBox">
              <span className="icon"><ion-icon name="lock-closed"></ion-icon></span>
              <Form.Control type="password" name="confirmPassword" value={confirmPassword} onChange={handleChange} isInvalid={!!errors.confirmPassword} required />
              <label>Confirm Password</label>
            </div>
          </Form.Group>
          <Form.Control.Feedback className="text-danger" type="invalid">{errors.confirmPassword}</Form.Control.Feedback>

          <span className="btnHolder">
            <Button type="submit" className={`submit-btn ${formValid ? "enabled" : "disabled"}`} disabled={!formValid}>
              Register
            </Button>
            <div className="registerLink">
              <p className="haveAnAcount">Already have an account?
                <Link to="/login"><span className="registerHover"> Log in</span></Link></p>
            </div>
          </span>
        </Form>
      </section>
    </div>
  );
};
export default RegistrationForm;
