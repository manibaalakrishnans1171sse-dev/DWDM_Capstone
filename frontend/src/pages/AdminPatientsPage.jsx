import { useCallback, useEffect, useState } from "react";
import { registerPatient, fetchPatients } from "../api/auth";
import { getErrorMessage } from "../api/axios";

const EMPTY_FORM = { full_name: "", email: "", password: "", confirm_password: "" };

export default function AdminPatientsPage() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [patients, setPatients] = useState(null);
  const [listError, setListError] = useState("");

  const loadPatients = useCallback(() => {
    fetchPatients()
      .then(setPatients)
      .catch((err) => setListError(getErrorMessage(err)));
  }, []);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (form.password !== form.confirm_password) {
      setError("Passwords do not match");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const patient = await registerPatient(form);
      setSuccess(`Patient login created for ${patient.email}`);
      setForm(EMPTY_FORM);
      loadPatients();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-navy">Patient Registration</h1>
        <p className="text-sm text-slate-500">
          Create MediFind (chatbot-only) logins for patients. Admin-only — analyst accounts cannot access this page
          or its API.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-coral text-sm px-4 py-3">{error}</div>
        )}
        {success && (
          <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 text-sage text-sm px-4 py-3">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              name="full_name"
              required
              value={form.full_name}
              onChange={handleChange}
              placeholder="Jane Doe"
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              name="email"
              required
              value={form.email}
              onChange={handleChange}
              placeholder="patient@example.com"
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
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
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Confirm</label>
              <input
                type="password"
                name="confirm_password"
                required
                value={form.confirm_password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
              />
            </div>
          </div>

          <div className="rounded-lg bg-teal-50 border border-teal-100 px-3.5 py-2.5 text-sm text-teal font-medium">
            Account type: Patient (MediFind access only)
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto rounded-lg bg-navy hover:bg-navy-light text-white font-semibold px-6 py-2.5 text-sm transition-colors disabled:opacity-60"
          >
            {loading ? "Creating..." : "Create Patient Login"}
          </button>
        </form>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Registered Patients</h2>
        {listError && (
          <div className="rounded-lg bg-red-50 border border-red-200 text-coral text-sm px-4 py-3">{listError}</div>
        )}
        {!listError && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto thin-scrollbar">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {["Name", "Email", "Created"].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 font-semibold text-slate-600 border-b border-slate-200 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!patients &&
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 3 }).map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="skeleton h-4 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))}
                {patients?.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center text-slate-400 py-8 text-sm">
                      No patient logins created yet.
                    </td>
                  </tr>
                )}
                {patients?.map((p, i) => (
                  <tr key={p.user_id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                    <td className="px-4 py-2.5 text-slate-700">{p.full_name}</td>
                    <td className="px-4 py-2.5 text-slate-500">{p.email}</td>
                    <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                      {p.created_at ? new Date(p.created_at).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
