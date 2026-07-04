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
    <div className="sportPlaceCard">
      <div className="inner">
        <img width={250} src={src} alt="sportPlace" onError={() => setBroken(true)} />
        <h3>{place.name}</h3>
        {place.site && (
          <a
            href={place.site.startsWith("http") ? place.site : `http://${place.site}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {place.site}
          </a>
        )}
        <p>{place.address}</p>
        <p>{place.phone}</p>
        <p>{place.workingHours}</p>
        {place.distanceKm !== undefined && <p>{`📍 ${place.distanceKm} km away`}</p>}
      </div>
    </div>
  );
}
