import { Col, Container, Row } from "react-bootstrap";
import HomeCard from "../../components/HomeCard/HomeCard";
import myVideo from "../../images/11.mov";
import activities from "../../images/homePage/Icons8_flat_sports_mode.svg.png";
import places from "../../images/homePage/homePagePlaces.png";
import myProfile from "../../images/homePage/homePageProfile.png";
import messages from "../../images/homePage/mess.png";
import buddySearch from "../../images/homePage/search.png";
import "./Home.scss";

export default function HomePage() {
  const navElements = [
    { image: myProfile, description: "My profile", to: "/profile" },
    { image: activities, description: "Activities", to: "/activities" },
    { image: buddySearch, description: "Buddy search", to: "/buddySearch" },
    { image: messages, description: "Messages", to: "/messages" },
    { image: places, description: "Places", to: "/places" },
  ];

  return (
    <div>
      <video className="background-video" autoPlay muted loop>
        <source src={myVideo} type="video/mp4" />
      </video>
      <Container className="home-container">
        <Row>
          <Col className="siteDescription">
            <h2 className="siteNameTitle">SPORTS MATCH</h2>
            <div className="logo"></div>
            <h2 className="siteSloganTitle">
              Choose an activity, meet new people, have fun doing it together
            </h2>
          </Col>
        </Row>
        <Row className="navContainer">
          {navElements.map((data) => (
            <Col key={data.description} xs={6} sm={6} md={4} lg={3}>
              <HomeCard image={data.image} description={data.description} to={data.to} />
            </Col>
          ))}
        </Row>
      </Container>
    </div>
  );
}
