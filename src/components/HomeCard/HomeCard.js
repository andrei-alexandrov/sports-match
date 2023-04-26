import "./HomeCard.scss";
import { Link } from "react-router-dom";


export default function HomeCard({image, description, to}) {
   
    return (
        <div className="homeCardContainer">
            <Link to={to}><img src={image} alt={"Sport Match photo"}/></Link>
            <Link to={to}> <h2>{description}</h2></Link>
        </div>
    )
}



