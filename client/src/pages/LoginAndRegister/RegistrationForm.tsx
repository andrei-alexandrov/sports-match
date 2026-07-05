import { registerInputSchema } from "@sports-match/shared";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../../api/http";
import CustomAlert from "../../components/CustomAlert/CustomAlert";
import Radar from "../../components/Orbit/Radar";
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    <div className="authPage">
      <div className="authPage__decor" aria-hidden="true">
        <Radar size={220} sweep={false} />
      </div>
      <form className="authCard" onSubmit={handleSubmit}>
        <span className="authCard__mark" aria-hidden="true" />
        <h1 className="authCard__title">Join the club</h1>
        <p className="authCard__subtitle">Create your free account</p>
        {alert.show && <CustomAlert variant={alert.variant} message={alert.message} />}
        <label className="authCard__label" htmlFor="username">
          Username
        </label>
        <input
          id="username"
          className={errors.username ? "authCard__input authCard__input--invalid" : "authCard__input"}
          type="text"
          name="username"
          value={username}
          onChange={handleChange}
          autoComplete="username"
          required
        />
        {errors.username && <p className="authCard__error">{errors.username}</p>}
        <label className="authCard__label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          className={errors.password ? "authCard__input authCard__input--invalid" : "authCard__input"}
          type="password"
          name="password"
          value={password}
          onChange={handleChange}
          autoComplete="new-password"
          required
        />
        {errors.password && <p className="authCard__error">{errors.password}</p>}
        <label className="authCard__label" htmlFor="confirmPassword">
          Confirm password
        </label>
        <input
          id="confirmPassword"
          className={errors.confirmPassword ? "authCard__input authCard__input--invalid" : "authCard__input"}
          type="password"
          name="confirmPassword"
          value={confirmPassword}
          onChange={handleChange}
          autoComplete="new-password"
          required
        />
        {errors.confirmPassword && <p className="authCard__error">{errors.confirmPassword}</p>}
        <button type="submit" className="authCard__submit" disabled={!formValid}>
          Sign up
        </button>
        <p className="authCard__switch">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </form>
    </div>
  );
};
export default RegistrationForm;
