import "./PlacesCard.scss";
import React from "react";

export default function PlacesCard({ image, name, site, address, phone, workHours }) {
    return (

        <div className='sportPlaceCard'>
            <div className="inner">
            <img width={250} src={image} alt={"sportPlace"} />
                <h3>{name}</h3>
                <a href={`http://${site}`} target="_blank" rel="noopener noreferrer">{site}</a>
                <p>{address}</p>
                <p>{`${phone}`}</p>
                <p>{`${workHours}`}</p>
            </div>

        </div>
    )
}