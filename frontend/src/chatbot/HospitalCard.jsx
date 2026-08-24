const rankColors = {
  0: "border-yellow-400 bg-yellow-50",
  1: "border-gray-400 bg-gray-50",
  2: "border-orange-400 bg-orange-50",
};

const rankLabels = {
  0: "🏆 Best Match",
  1: "🥈 2nd Best",
  2: "🥉 3rd Best",
};

function ScoreBar({ label, value, max = 100, color = "teal" }) {
  const colors = {
    teal: "bg-teal-500",
    blue: "bg-blue-500",
    green: "bg-green-500",
  };
  return (
    <div className="flex items-center gap-2 text-xs mb-1">
      <span className="w-24 text-gray-500 shrink-0">{label}</span>
      <div className="flex-1 bg-gray-200 rounded-full h-2">
        <div
          className={`${colors[color]} h-2 rounded-full`}
          style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
        />
      </div>
      <span className="w-8 text-right text-gray-600">{value}%</span>
    </div>
  );
}

export default function HospitalCard({ hospital, index }) {
  const borderClass = rankColors[index] || "border-teal-300 bg-white";
  const rankLabel = rankLabels[index] || `#${index + 1}`;
  const score = hospital.score;

  return (
    <div className={`border-l-4 rounded-xl p-5 shadow-sm mb-4 ${borderClass}`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-2">
        <div>
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{rankLabel}</span>
          <h3 className="text-lg font-bold text-gray-800 mt-0.5">
            {hospital.type === "Hospital" ? "🏥" : "🏨"} {hospital.name}
          </h3>
          <span className="text-xs text-gray-500">{hospital.type}</span>
        </div>
        <span
          className={`text-xs font-bold px-2 py-1 rounded-full ${
            hospital.open_now ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}
        >
          {hospital.open_now ? "● OPEN" : "● CLOSED"}
        </span>
      </div>

      {/* Specialty mismatch warning */}
      {hospital.warning && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-2 text-xs text-amber-700 flex items-start gap-1">
          <span>{hospital.warning}</span>
        </div>
      )}

      {/* Specialty match badge */}
      {hospital.score?.specialtyBonus && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-2 text-xs text-green-700">
          ✅ Specialty match for your condition
        </div>
      )}

      {/* Rating */}
      <div className="mb-2">
        <span className="text-yellow-400">
          {"★".repeat(Math.floor(hospital.rating))}
          {"☆".repeat(5 - Math.floor(hospital.rating))}
        </span>
        <span className="text-sm text-gray-600 ml-1">
          {hospital.rating} · {hospital.reviews} reviews
        </span>
      </div>

      {/* Info */}
      <div className="text-sm text-gray-600 space-y-1 mb-3">
        <p>
          📍 <strong>{score.distKm} km away</strong> — {hospital.address}
        </p>
        {hospital.phone && <p>📞 {hospital.phone}</p>}
        {hospital.emergency && <p className="text-red-600 font-semibold">🚨 Emergency Services Available</p>}
        {hospital.beds && <p>🛏️ {hospital.beds}</p>}
      </div>

      {/* Match Score Bars */}
      <div className="mb-3">
        <p className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
          Match Score — {score.total}%
        </p>
        <ScoreBar label="⭐ Rating (40%)" value={score.ratingScore} max={40} color="teal" />
        <ScoreBar label="📍 Distance (40%)" value={score.distScore} max={40} color="blue" />
        <ScoreBar label="🕐 Open (20%)" value={score.openScore} max={20} color="green" />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 flex-wrap">
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${hospital.lat},${hospital.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 bg-teal-600 text-white text-sm font-semibold py-2 px-4 rounded-lg text-center hover:bg-teal-700 transition-colors"
        >
          📍 Get Directions
        </a>
        {hospital.phone && (
          <a
            href={`tel:${hospital.phone}`}
            className="flex-1 bg-navy-600 border border-teal-600 text-teal-700 text-sm font-semibold py-2 px-4 rounded-lg text-center hover:bg-teal-50 transition-colors"
          >
            📞 Call Now
          </a>
        )}
        {hospital.website && (
          <a
            href={hospital.website}
            target="_blank"
            rel="noopener noreferrer"
            className="border border-gray-300 text-gray-600 text-sm py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
          >
            🌐
          </a>
        )}
      </div>
    </div>
  );
}
