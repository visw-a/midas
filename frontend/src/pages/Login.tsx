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
    <div className="flex min-h-screen items-center justify-center bg-ink-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
            McIntire Investment Institute
          </p>
          <h1 className="mt-2 text-xl font-semibold text-ink-100">Portfolio Tracker</h1>
        </div>
        <form onSubmit={onSubmit} className="rounded-xl border border-ink-800 bg-ink-900/60 p-6">
          <label className="block text-xs font-medium uppercase tracking-wide text-ink-400">
            Access Password
          </label>
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-2 w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-100 outline-none focus:border-accent"
            placeholder="••••••••"
          />
          {error && <p className="mt-2 text-xs text-loss">{error}</p>}
          <button
            type="submit"
            disabled={submitting || !password}
            className="mt-4 w-full rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-ink-500">
          Private dashboard for MII portfolio management. Contact the PM team for access.
        </p>
      </div>
    </div>
  );
}
