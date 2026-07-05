import { Link } from "react-router-dom";
import Radar from "../../components/Orbit/Radar";
import "./Home.scss";

const FEATURES = [
  { icon: "👥", title: "Find buddies", text: "By sport and city, instantly" },
  { icon: "💬", title: "Chat live", text: "Arrange the game in-app" },
  { icon: "📍", title: "Meet nearby", text: "54 venues, sorted by distance" },
];

const HERO_DOTS: { emoji: string; style: React.CSSProperties }[] = [
  { emoji: "🎾", style: { left: "12%", top: "20%", animationDelay: "0s" } },
  { emoji: "🏀", style: { right: "6%", top: "34%", animationDelay: "1.1s" } },
  { emoji: "🏸", style: { left: "24%", bottom: "8%", animationDelay: "2.2s" } },
];

export default function HomePage() {
  return (
    <div className="homePage">
      <section className="homePage__hero">
        <div className="homePage__intro">
          <span className="homePage__badge">SOFIA · 40 SPORTS</span>
          <h1 className="homePage__title">
            Never play
            <br />
            alone again
          </h1>
          <p className="homePage__subtitle">
            Find people who play your sport, chat, and meet at a venue near you.
          </p>
          <div className="homePage__actions">
            <Link className="homePage__primaryCta" to="/buddySearch">
              Find a partner
            </Link>
            <Link className="homePage__ghostCta" to="/places">
              Browse venues
            </Link>
          </div>
        </div>
        <div className="homePage__radarWrap">
          <Radar size={280}>
            <span className="homePage__you">A</span>
          </Radar>
          {HERO_DOTS.map((dot) => (
            <span key={dot.emoji} className="orbit-dot homePage__dot" style={dot.style}>
              {dot.emoji}
            </span>
          ))}
        </div>
      </section>

      <section className="homePage__features">
        {FEATURES.map((feature) => (
          <article key={feature.title} className="homePage__feature">
            <span className="homePage__featureIcon" aria-hidden="true">
              {feature.icon}
            </span>
            <h3 className="homePage__featureTitle">{feature.title}</h3>
            <p className="homePage__featureText">{feature.text}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
