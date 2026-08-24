import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import { NAV_ITEMS, PATIENT_NAV_ITEMS, ADMIN_NAV_ITEMS } from "../components/icons";
import { isTokenValid, getStoredUser } from "../api/auth";
import SymptomForm from "./SymptomForm";
import DiagnosisCard from "./DiagnosisCard";
import RankingExplainer from "./RankingExplainer";
import HospitalFinder from "./HospitalFinder";

const EMERGENCY_CONTACTS = [
  { label: "National Emergency", number: "112", icon: "🆘", color: "red" },
  { label: "Ambulance (EMRI)", number: "108", icon: "🚑", color: "red" },
  { label: "Ambulance", number: "102", icon: "🚑", color: "orange" },
  { label: "Police", number: "100", icon: "👮", color: "blue" },
  { label: "Fire Brigade", number: "101", icon: "🚒", color: "orange" },
  { label: "Health Helpline", number: "104", icon: "🏥", color: "green" },
  { label: "Women Helpline", number: "181", icon: "👩", color: "purple" },
  { label: "Child Helpline", number: "1098", icon: "🧒", color: "teal" },
];

function EmergencyContactsStrip() {
  return (
    <div className="mt-10 border-t pt-6">
      <h3 className="text-center text-gray-500 text-sm font-semibold mb-3 uppercase tracking-wide">
        🇮🇳 India Emergency Contacts
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {EMERGENCY_CONTACTS.map((contact) => (
          <a
            key={contact.number}
            href={`tel:${contact.number}`}
            className="flex flex-col items-center justify-center bg-white border border-gray-200 rounded-lg py-3 px-2 hover:shadow-md hover:border-teal-400 transition-all text-center"
          >
            <span className="text-xl mb-1">{contact.icon}</span>
            <span className="font-bold text-gray-800 text-lg">{contact.number}</span>
            <span className="text-xs text-gray-500 mt-0.5">{contact.label}</span>
          </a>
        ))}
      </div>
      <p className="text-center text-xs text-gray-400 mt-3">Tap any number to call directly from your phone</p>
    </div>
  );
}

function DisclaimerBanner() {
  return (
    <div className="bg-amber-50 border border-amber-300 text-amber-800 px-4 py-3 text-sm flex items-start gap-2">
      <span className="text-lg">⚠️</span>
      <span>
        This tool is for informational purposes only and does not replace professional medical advice.
        <strong> In a medical emergency, call 112 (National Emergency) or 108 (Ambulance) immediately.</strong>
      </span>
    </div>
  );
}

export default function ChatbotPage() {
  const [result, setResult] = useState(null);
  const [emergency, setEmergency] = useState(false);
  const [showHospitals, setShowHospitals] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const hospitalsRef = useRef(null);

  // Logged-in visitors (any role) get MediFind embedded inside the app's own
  // Navbar/Sidebar chrome instead of the standalone public header — it should
  // feel like a page of the app, not a separate site. Anonymous visitors
  // (the common case — this route needs no login) still get the standalone
  // header with a link back to /login.
  const loggedIn = isTokenValid();
  const user = loggedIn ? getStoredUser() : null;
  const navItems =
    user?.role === "patient" ? PATIENT_NAV_ITEMS : user?.role === "admin" ? ADMIN_NAV_ITEMS : NAV_ITEMS;

  function handlePredicted(data, isEmergency) {
    setResult(data);
    setEmergency(isEmergency);
    setShowHospitals(false);
  }

  function handleReset() {
    setResult(null);
    setEmergency(false);
    setShowHospitals(false);
  }

  function handleFindHospitals() {
    setShowHospitals(true);
    setTimeout(() => {
      hospitalsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  const content = (
    <main className={loggedIn ? "max-w-3xl mx-auto px-4 py-8 space-y-8" : "max-w-3xl mx-auto px-4 py-10 space-y-8"}>
      {!result && (
        <div className="text-center mb-2">
          <h1 className="text-xl sm:text-2xl font-bold text-navy">Describe your symptoms to get started</h1>
          <p className="text-sm text-slate-500 mt-1">
            Our AI will analyze them and help you find the right care nearby
          </p>
        </div>
      )}

      {!result && <SymptomForm onPredicted={handlePredicted} />}

      {result && (
        <DiagnosisCard
          result={result}
          emergency={emergency}
          onReset={handleReset}
          onFindHospitals={handleFindHospitals}
        />
      )}

      {result && showHospitals && (
        <div ref={hospitalsRef} className="space-y-4 pt-4">
          <RankingExplainer />
          <HospitalFinder specialist={result?.specialist} />
        </div>
      )}

      <EmergencyContactsStrip />
    </main>
  );

  if (loggedIn) {
    return (
      <div className="min-h-screen bg-page">
        <Navbar onMenuClick={() => setMobileOpen(true)} navItems={navItems} />
        <div className="flex">
          <Sidebar
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed((v) => !v)}
            mobileOpen={mobileOpen}
            onCloseMobile={() => setMobileOpen(false)}
            navItems={navItems}
          />
          <div className="flex-1 min-w-0">
            <div className="px-4 pt-4">
              <DisclaimerBanner />
            </div>
            {content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page">
      <header className="bg-navy text-white px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-teal">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 6v12M6 12h12" strokeLinecap="round" />
            </svg>
          </span>
          <div>
            <p className="font-bold leading-tight">MediFind</p>
            <p className="text-[11px] text-slate-300 leading-tight hidden sm:block">
              AI-Powered Symptom Checker &amp; Hospital Locator
            </p>
          </div>
        </div>
        <Link to="/login" className="text-sm text-teal-light hover:underline whitespace-nowrap">
          Login to Dashboard →
        </Link>
      </header>

      <div className="px-4 pt-4">
        <DisclaimerBanner />
      </div>
      {content}
    </div>
  );
}
