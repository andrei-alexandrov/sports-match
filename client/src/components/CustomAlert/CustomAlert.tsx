import "./CustomAlert.scss";

interface CustomAlertProps {
  variant: "success" | "danger" | "warning" | "info";
  message: string;
}

export default function CustomAlert({ variant, message }: CustomAlertProps) {
  return (
    <div className={`orbitAlert orbitAlert--${variant}`} role="alert">
      {message}
    </div>
  );
}
