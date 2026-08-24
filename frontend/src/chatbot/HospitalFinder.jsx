import { useState } from "react";
import { searchNearbyHospitals, geocodeCity } from "./hospitalService";
import HospitalMap from "./HospitalMap";
import HospitalCard from "./HospitalCard";

export default function HospitalFinder({ specialist = null }) {
  const [userLocation, setUserLocation] = useState(null);
  const [hospitals, setHospitals] = useState([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [manualCity, setManualCity] = useState("");
  const [searchingHospitals, setSearchingHospitals] = useState(false);

  const findHospitals = async (lat, lng) => {
    setSearchingHospitals(true);
    try {
      const results = await searchNearbyHospitals(lat, lng, 10000, specialist);
      setHospitals(results);
    } catch (err) {
      console.error("Hospital search failed:", err);
      setLocationError("Could not find hospitals. Try entering your city manually.");
    } finally {
      setSearchingHospitals(false);
    }
  };

  const requestLocation = () => {
    if (!navigator.onLine) {
      setLocationError("You appear to be offline. Please check your connection.");
      return;
    }
    setLocationLoading(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setLocationLoading(false);
        await findHospitals(latitude, longitude);
      },
      () => {
        setLocationLoading(false);
        setLocationError("Location access denied. Please enter your city below.");
      },
      { timeout: 10000 },
    );
  };

  const handleManualCity = async () => {
    if (!manualCity.trim()) return;
    setLocationLoading(true);
    setLocationError(null);
    try {
      const { lat, lng } = await geocodeCity(manualCity);
      setUserLocation({ lat, lng });
      await findHospitals(lat, lng);
    } catch {
      setLocationError(`Could not find "${manualCity}". Try a different city name.`);
    } finally {
      setLocationLoading(false);
    }
  };

  return (
    <div className="mt-6 max-w-[680px] mx-auto">
      <h2 className="text-xl font-bold text-gray-800 mb-4">🏥 Nearby Hospitals &amp; Clinics</h2>

      {!userLocation && !locationLoading && (
        <div className="text-center">
          <button
            onClick={requestLocation}
            className="bg-teal-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-teal-700"
          >
            📍 Find Hospitals Near Me
          </button>
        </div>
      )}

      {locationLoading && (
        <div className="text-center py-8">
          <div className="animate-spin text-4xl mb-2">🔄</div>
          <p className="text-gray-500">Finding your location and searching hospitals...</p>
        </div>
      )}

      {locationError && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-4">
          <p className="text-amber-700 mb-3">{locationError}</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualCity}
              onChange={(e) => setManualCity(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleManualCity()}
              placeholder="Enter your city (e.g. Chennai, Mumbai)"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <button
              onClick={handleManualCity}
              className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-semibold"
            >
              Search
            </button>
          </div>
        </div>
      )}

      {searchingHospitals && (
        <div className="text-center py-6">
          <p className="text-gray-500 animate-pulse">🔍 Searching hospitals near you via OpenStreetMap...</p>
        </div>
      )}

      {userLocation && hospitals.length > 0 && (
        <>
          <p className="text-sm text-gray-500 mb-3">
            Found {hospitals.length} facilities within 10km
            {specialist ? ` · Ranked by relevance for ${specialist}, rating & distance` : " · Ranked by rating & distance"}
          </p>
          <HospitalMap userLat={userLocation.lat} userLng={userLocation.lng} hospitals={hospitals} />
          <div className="mt-4">
            {hospitals.map((hospital, index) => (
              <HospitalCard key={hospital.id} hospital={hospital} index={index} />
            ))}
          </div>
        </>
      )}

      {userLocation && !searchingHospitals && hospitals.length === 0 && !locationError && (
        <div className="text-center py-8 text-gray-500">
          <p className="text-4xl mb-2">🏥</p>
          <p>No hospitals found within 10km of your location.</p>
          <p className="text-sm mt-1">Try searching a nearby city name instead.</p>
        </div>
      )}

      {/* Attribution — required by OpenStreetMap */}
      <p className="text-xs text-gray-400 text-center mt-4">
        Hospital data ©{" "}
        <a
          href="https://www.openstreetmap.org/copyright"
          className="underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          OpenStreetMap
        </a>{" "}
        contributors · Map by{" "}
        <a href="https://leafletjs.com" className="underline" target="_blank" rel="noopener noreferrer">
          Leaflet
        </a>
      </p>
    </div>
  );
}
