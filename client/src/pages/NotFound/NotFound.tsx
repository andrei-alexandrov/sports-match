import { Link } from "react-router-dom";
import Radar from "../../components/Orbit/Radar";
import "./NotFound.scss";

export default function NotFound() {
  return (
    <div className="notFound">
      <Radar size={160} sweep={false} />
      <h1 className="notFound__title">Off the radar</h1>
      <p className="notFound__text">This page doesn&apos;t exist — but your next game does.</p>
      <Link className="notFound__cta" to="/home">
        Back home
      </Link>
    </div>
  );
}
