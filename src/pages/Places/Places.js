import React, { useState, useEffect } from 'react';
import placesData from "./placesData";
import PlacesCard from "../../components/PlacesCard/PlacesCard";
import useDebounce from '../../components/Utils/Debounce';

import "./Places.scss";

export default function PlacesPage() {
  const [items, setItems] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [selectedItem, setSelectedItem] = useState("");

  const sportsTypes = [...new Set(placesData.map(place => place.type))].sort((a, b) => a.localeCompare(b));

  const debouncedSearchText = useDebounce(searchText, 300);
  const debouncedSelectedItem = useDebounce(selectedItem, 300);

  useEffect(() => {
    const filteredItems = placesData.filter((item) => {
      const nameMatch = item.name.toLowerCase().includes(debouncedSearchText.toLowerCase());
      const addressMatch = item.address.toLowerCase().includes(debouncedSearchText.toLowerCase());
      const typeMatch = debouncedSelectedItem === "" || item.type === debouncedSelectedItem;
      return (nameMatch || addressMatch) && typeMatch;
    });
    setItems(filteredItems);
  }, [debouncedSearchText, debouncedSelectedItem]);

  const handleSearch = (event) => {
    setSearchText(event.target.value);
  };

  const handleSelect = (event) => {
    setSelectedItem(event.target.value);
  };

  return (
    <div className="placesPage">
      <h2 style={{ display: "flex", justifyContent: "center" }} className="siteSloganTitle">Choose your favorite sport and get suggestions where to play in Sofia</h2>

      <div className='searchWrapper'>
        <div>
          <input className='inputSearch' name='inputSearchField' type="text" value={searchText} onChange={handleSearch} placeholder="Type to search" />
        </div>

        <div style={{ color: "white" }}>
          or / and
          <select className='selectSearch' name='inputSearchField' value={selectedItem} onChange={handleSelect}>
            <option value="">Choose sport category</option>
            {sportsTypes.map(sport => <option key={sport} value={sport}>{sport.charAt(0).toUpperCase() + sport.slice(1)}</option>)}
          </select>
        </div>
      </div>

      {items.length > 0 ? (
        <div className='sportsPageContainer'>
          {items.map((item) => (
            <div key={item.phone}>
              <PlacesCard
                key={item.phone}
                image={item.image}
                name={item.name}
                site={item.site}
                address={item.address}
                phone={item.phone}
                workHours={item.workingHours}
              />
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: "center", fontSize: 28 }}>No results</div>
      )}
    </div>
  );
}


