import React from "react";
import HomeCard from "../../components/HomeCard/HomeCard";
import myProfile from "../../images/homePage/homePageProfile.png";
import activities from "../../images/homePage/Icons8_flat_sports_mode.svg.png";
import buddySearch from "../../images/homePage/homePageRequests.png";
import messages from "../../images/homePage/mess.png";
import places from "../../images/homePage/homePagePlaces.png";
import myVideo from "../../images/11.mov";
import "./Home.scss"


export default function HomePage() {

    const navElements = [
        {
            image: myProfile,
            description: "My profile",
            to: "/profile"
        },
        {
            image: activities,
            description: "Activities",
            to: "/activities"
        },
        {
            image: buddySearch,
            description: "Buddy search",
            to: "/buddySearch"
        },
        {
            image: messages,
            description: "Messages",
            to: "/messages"
        },
        {
            image: places,
            description: "Places",
            to: "/places"
        },
    ]

    return (
        <div>
            <video id="background-video" autoPlay muted loop>
                <source src={myVideo} type="video/mp4" />
                Your browser does not support the video tag.
            </video>
            <div className="homeContainer">
                <h2 className="siteNameTitle">SPORTS MATCH</h2>
                <div className="logo">
                </div>
                <h2 className="siteSloganTitle">Choose an activity, meet new people, have fun doing it TOGETHER</h2>
                <div className="homeCardContainerWrapper">
                    {navElements.map(data => (
                        <HomeCard
                            key={data.description}
                            image={data.image}
                            description={data.description}
                            to={data.to}
                            className="linkIcon"
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}

