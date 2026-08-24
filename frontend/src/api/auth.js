import { jwtDecode } from "jwt-decode";
import api from "./axios";

export function login(email, password) {
  return api.post("/auth/login", { email, password }).then((res) => res.data);
}

export function register({ full_name, email, password, confirm_password, role }) {
  return api
    .post("/auth/register", { full_name, email, password, confirm_password, role })
    .then((res) => res.data);
}

export function forgotPassword(email) {
  return api.post("/auth/forgot-password", { email }).then((res) => res.data);
}

// Admin-only: create a patient (chatbot-only) login. Backend enforces the
// admin gate independently via require_roles("admin") on /auth/register-patient.
export function registerPatient({ full_name, email, password, confirm_password }) {
  return api
    .post("/auth/register-patient", { full_name, email, password, confirm_password })
    .then((res) => res.data);
}

export function fetchPatients() {
  return api.get("/auth/patients").then((res) => res.data);
}

export function fetchMe() {
  return api.get("/auth/me").then((res) => res.data);
}

export function saveSession({ token, user_id, email, full_name, role }) {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify({ user_id, email, full_name, role }));
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export function isTokenValid() {
  const token = localStorage.getItem("token");
  if (!token) return false;
  try {
    const decoded = jwtDecode(token);
    if (!decoded.exp) return false;
    return decoded.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}
