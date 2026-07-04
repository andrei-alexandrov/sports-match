import type { PublicPlace } from "@sports-match/shared";
import { useEffect, useState } from "react";
import { activityByKey, type ClientActivity } from "../../activities/catalogue";
import * as placesApi from "../../api/places";
import CustomAlert from "../../components/CustomAlert/CustomAlert";
import PlacesCard from "../../components/PlacesCard/PlacesCard";
import useDebounce from "../../components/Utils/Debounce";
import { sportOptionsFrom } from "./sportOptions";
import "./Places.scss";

export default function PlacesPage() {
  const [places, setPlaces] = useState<PublicPlace[]>([]);
  const [searchText, setSearchText] = useState("");
  const [selectedSport, setSelectedSport] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [sportOptions, setSportOptions] = useState<ClientActivity[]>([]);
  const [error, setError] = useState("");
  const debouncedSearchText = useDebounce(searchText, 300);

  useEffect(() => {
    let cancelled = false;
    const q = debouncedSearchText.trim() || undefined;
    // Select options come from the catalogue, so the value is a valid key or "".
    const sport = (selectedSport || undefined) as placesApi.SearchPlacesParams["sport"];
    const unfiltered = !sport && !q && !coords;
    placesApi
      .searchPlaces({ sport, q, ...(coords ?? {}) })
      .then((results) => {
        if (cancelled) {
          return;
        }
        setPlaces(results);
        setError("");
        if (unfiltered) {
          // Derive the dropdown from an unfiltered load only, so filtering
          // never shrinks the list of available options.
          setSportOptions(sportOptionsFrom(results));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPlaces([]);
          setError("Could not load places. Please try again.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedSport, debouncedSearchText, coords]);

  const handleNearMe = () => {
    if (coords) {
      setCoords(null);
      return;
    }
    if (!("geolocation" in navigator)) {
      setError("Location is not available in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        setError("");
      },
      () => {
        setError("Could not get your location. Check the browser permission and try again.");
      },
    );
  };

  return (
    <div className="placesPage">
      <h2 style={{ display: "flex", justifyContent: "center" }} className="siteSloganTitle">
        Choose your favorite sport and get suggestions where to play in Sofia
      </h2>

      <div className="searchWrapper">
        <div>
          <input
            className="inputSearch"
            name="inputSearchField"
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Type to search"
          />
        </div>

        <div style={{ color: "white" }}>
          or / and
          <select
            className="selectSearch"
            name="inputSearchField"
            value={selectedSport}
            onChange={(e) => setSelectedSport(e.target.value)}
          >
            <option value="">Choose sport category</option>
            {sportOptions.map((sport) => (
              <option key={sport.key} value={sport.key}>
                {sport.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <button
            type="button"
            className={coords ? "nearMeButton active" : "nearMeButton"}
            onClick={handleNearMe}
          >
            {coords ? "Near me ✓" : "Near me"}
          </button>
        </div>
      </div>

      {error && <CustomAlert variant="danger" message={error} />}

      {places.length > 0 ? (
        <div className="sportsPageContainer">
          {places.map((place) => (
            <div key={place.id}>
              <PlacesCard place={place} fallbackImage={activityByKey(place.sports[0])?.image ?? ""} />
            </div>
          ))}
        </div>
      ) : (
        !error && <div style={{ textAlign: "center", fontSize: 28 }}>No results</div>
      )}
    </div>
  );
}
