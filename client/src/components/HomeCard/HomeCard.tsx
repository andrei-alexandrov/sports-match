import { Link } from "react-router-dom";
import "./HomeCard.scss";

interface HomeCardProps {
  image: string;
  description: string;
  to: string;
}

export default function HomeCard({ image, description, to }: HomeCardProps) {
  return (
    <div className="homeCardContainer">
      <Link to={to}><img src={image} alt="Sport Match photo" /></Link>
      <Link to={to}> <h2>{description}</h2></Link>
    </div>
  );
}
