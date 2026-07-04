import { Alert } from "react-bootstrap";

interface CustomAlertProps {
  variant: "success" | "danger" | "warning" | "info";
  message: string;
}

export default function CustomAlert({ variant, message }: CustomAlertProps) {
  return <Alert variant={variant}>{message}</Alert>;
}
