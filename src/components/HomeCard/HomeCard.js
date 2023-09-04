// import React from 'react';
// import { Link } from 'react-router-dom';
// import { Card } from 'react-bootstrap';

// import "./HomeCard.scss";

// export default function HomeCard({ image, description, to }) {
//     return (
//         <Card className="homeCardContainer">
//             <Link to={to}>
//                 <Card.Img className='tester' src={image} alt="Sport Match photo" />
//             </Link>
//             <Card.Body>
//                 <Link to={to}>
//                     <Card.Title>{description}</Card.Title>
//                 </Link>
//             </Card.Body>
//         </Card>
//     );
// }

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
