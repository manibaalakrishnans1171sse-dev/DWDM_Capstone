import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { login, saveSession } from "../api/auth";
import { getErrorMessage } from "../api/axios";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await login(form.email, form.password);
      saveSession(data);
      const redirectTo = data.role === "patient" ? "/chatbot" : location.state?.from || "/dashboard";
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-page px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-navy flex items-center justify-center shadow-lg mb-3">
            <svg viewBox="0 0 24 24" className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 20V10M12 20V4M18 20v-7" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-navy">Adaptive BI</h1>
          <p className="text-sm text-slate-500">Hospital Data Warehouse &amp; Mining System</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-1">Welcome back</h2>
          <p className="text-sm text-slate-500 mb-6">Sign in to access the dashboard</p>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-coral text-sm px-4 py-3">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                name="email"
                required
                value={form.email}
                onChange={handleChange}
                placeholder="you@hospital.com"
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-slate-700">Password</label>
                <Link to="/forgot-password" className="text-xs text-teal hover:underline">
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                name="password"
                required
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-navy hover:bg-navy-light text-white font-semibold py-2.5 text-sm transition-colors disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Don't have an account?{" "}
            <Link to="/register" className="text-teal font-medium hover:underline">
              Register
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Looking for the symptom checker?{" "}
          <Link to="/chatbot" className="text-slate-500 hover:underline">
            Open MediFind
          </Link>
        </p>
      </div>
    </div>
  );
}
