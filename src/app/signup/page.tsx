"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Activity } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", username: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      setLoading(false);
      return;
    }
    // Auto sign in
    await signIn("credentials", {
      username: form.username,
      password: form.password,
      redirect: false,
    });
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-12"
      style={{ background: "linear-gradient(180deg, #0d1117 0%, #0a0a0f 100%)" }}>
      {/* Logo */}
      <div className="mb-10 fade-in-up flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center pulse-green"
          style={{ background: "linear-gradient(135deg, #30d158, #25a244)" }}>
          <Activity size={32} color="white" strokeWidth={2.5} />
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: "#f5f5f7" }}>TredTrack</h1>
          <p className="text-sm mt-1" style={{ color: "#8e8e93" }}>Start your journey today</p>
        </div>
      </div>

      <div className="w-full max-w-sm card p-6 fade-in-up" style={{ animationDelay: "0.1s" }}>
        <h2 className="text-xl font-semibold mb-6" style={{ color: "#f5f5f7" }}>Create account</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-medium mb-2 block" style={{ color: "#8e8e93" }}>FULL NAME</label>
            <input
              className="input-field"
              placeholder="Alex Johnson"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium mb-2 block" style={{ color: "#8e8e93" }}>USERNAME</label>
            <input
              className="input-field"
              placeholder="alex_runs"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/\s/g, "_") })}
              autoCapitalize="none"
              autoCorrect="off"
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium mb-2 block" style={{ color: "#8e8e93" }}>PASSWORD</label>
            <div className="relative">
              <input
                className="input-field pr-12"
                placeholder="Min. 6 characters"
                type={showPw ? "text" : "password"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
              <button
                type="button"
                className="absolute right-4 top-1/2 -translate-y-1/2"
                style={{ color: "#8e8e93" }}
                onClick={() => setShowPw(!showPw)}>
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-sm text-center py-2 px-3 rounded-xl"
              style={{ background: "rgba(255,69,58,0.15)", color: "#ff453a" }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary mt-2" disabled={loading}>
            {loading ? "Creating account…" : "Get Started"}
          </button>
        </form>
      </div>

      <p className="mt-6 text-sm fade-in-up" style={{ color: "#8e8e93", animationDelay: "0.2s" }}>
        Already have an account?{" "}
        <Link href="/login" style={{ color: "#30d158", fontWeight: 600 }}>
          Sign in
        </Link>
      </p>
    </div>
  );
}
