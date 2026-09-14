import { useState, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";

export function Login() {
  const { login } = useAuth();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(password);
    } catch {
      setError("Incorrect password");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-navy-800">
            McIntire Investment Institute
          </p>
          <h1 className="mt-2 text-xl font-bold text-navy-900">Portfolio Tracker</h1>
        </div>
        <form onSubmit={onSubmit} className="rounded-lg border border-navy-200 bg-white p-6">
          <label className="block text-xs font-bold uppercase tracking-wide text-navy-600">Access Password</label>
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-2 w-full rounded border border-navy-300 bg-white px-3 py-2 text-sm text-navy-900 outline-none focus:border-navy-800"
            placeholder="••••••••"
          />
          {error && <p className="mt-2 text-xs font-semibold text-navy-900">{error}</p>}
          <button
            type="submit"
            disabled={submitting || !password}
            className="mt-4 w-full rounded bg-navy-800 px-3 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-navy-500">
          Private dashboard for MII portfolio management. Contact the PM team for access.
        </p>
      </div>
    </div>
  );
}
