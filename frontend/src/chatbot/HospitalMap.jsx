import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";

// Fix Leaflet default marker icon (known issue with Vite)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom hospital icon (red)
const hospitalIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Gold icon for top ranked hospital
const goldIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [30, 46],
  iconAnchor: [15, 46],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Blue icon for user location
const userIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function MapController({ center }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 13);
  }, [center, map]);
  return null;
}

export default function HospitalMap({ userLat, userLng, hospitals }) {
  return (
    <div className="rounded-xl overflow-hidden border border-gray-200 shadow-md" style={{ height: "420px" }}>
      <MapContainer
        center={[userLat, userLng]}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapController center={[userLat, userLng]} />

        {/* User location */}
        <Marker position={[userLat, userLng]} icon={userIcon}>
          <Popup>
            <strong>📍 Your Location</strong>
          </Popup>
        </Marker>

        {/* 10km radius circle */}
        <Circle
          center={[userLat, userLng]}
          radius={10000}
          pathOptions={{ color: "#0D9488", fillColor: "#0D9488", fillOpacity: 0.05 }}
        />

        {/* Hospital markers */}
        {hospitals.map((hospital, index) => (
          <Marker
            key={hospital.id}
            position={[hospital.lat, hospital.lng]}
            icon={index === 0 ? goldIcon : hospitalIcon}
          >
            <Popup>
              <div style={{ minWidth: "180px" }}>
                <strong>
                  {index === 0 ? "🏆 " : "🏥 "}
                  {hospital.name}
                </strong>
                <br />
                <span>
                  ⭐ {hospital.rating} · {hospital.score.distKm} km away
                </span>
                <br />
                <span className="text-xs text-gray-500">{hospital.type}</span>
                <br />
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${hospital.lat},${hospital.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#0D9488", fontSize: "12px" }}
                >
                  📍 Get Directions
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
