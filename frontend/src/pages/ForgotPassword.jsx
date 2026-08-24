import { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "../api/auth";
import { getErrorMessage } from "../api/axios";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
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
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-1">Reset your password</h2>
          <p className="text-sm text-slate-500 mb-6">
            Enter your account email and we'll send you a reset link.
          </p>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-coral text-sm px-4 py-3">
              {error}
            </div>
          )}

          {sent ? (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 text-sage text-sm px-4 py-3">
              If this email exists, a reset link has been sent.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@hospital.com"
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-navy hover:bg-navy-light text-white font-semibold py-2.5 text-sm transition-colors disabled:opacity-60"
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
          )}

          <p className="text-center text-sm text-slate-500 mt-6">
            Remembered your password?{" "}
            <Link to="/login" className="text-teal font-medium hover:underline">
              Back to login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
