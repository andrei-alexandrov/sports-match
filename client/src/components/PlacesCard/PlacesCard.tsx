import type { PublicPlace } from "@sports-match/shared";
import { useState } from "react";
import "./PlacesCard.scss";

interface PlacesCardProps {
  place: PublicPlace;
  fallbackImage: string;
}

export default function PlacesCard({ place, fallbackImage }: PlacesCardProps) {
  // The seed's venue images are external hotlinks from the prototype; when
  // one dies, fall back to the local activity image so the card never shows
  // a broken-image icon.
  const [broken, setBroken] = useState(false);
  const src = !broken && place.image ? place.image : fallbackImage;
  return (
    <article className="placeCard">
      <img className="placeCard__img" src={src} alt={place.name} onError={() => setBroken(true)} />
      <div className="placeCard__body">
        <div className="placeCard__topRow">
          <h3 className="placeCard__name">{place.name}</h3>
          {place.distanceKm !== undefined && <span className="placeCard__distance">{place.distanceKm} km</span>}
        </div>
        <p className="placeCard__line">{place.address}</p>
        <p className="placeCard__line">{place.phone}</p>
        <p className="placeCard__line placeCard__line--muted">{place.workingHours}</p>
        {place.site && (
          <a
            className="placeCard__site"
            href={place.site.startsWith("http") ? place.site : `http://${place.site}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Visit website ↗
          </a>
        )}
      </div>
    </article>
  );
}
