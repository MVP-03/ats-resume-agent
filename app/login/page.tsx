"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (error) throw error;
        setMessage("Check your email to confirm your account, then sign in.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/");
        router.refresh();
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) { setError(error.message); setLoading(false); }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--bg)", padding: "24px",
    }}>
      <div style={{ width: "100%", maxWidth: "400px" }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{
            width: "48px", height: "48px", borderRadius: "14px",
            background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontWeight: 800, fontSize: "20px", margin: "0 auto 14px",
          }}>R</div>
          <h1 style={{ fontSize: "22px", fontWeight: 800, color: "var(--t1)", marginBottom: "6px" }}>ResumeAI</h1>
          <p style={{ fontSize: "13px", color: "var(--t2)" }}>
            {mode === "signin" ? "Sign in to your account" : "Create your free account"}
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: "28px" }}>

          {/* Mode toggle */}
          <div className="tab-bar" style={{ marginBottom: "22px" }}>
            <button className={`tab${mode === "signin" ? " active" : ""}`} onClick={() => { setMode("signin"); setError(""); setMessage(""); }}>
              Sign In
            </button>
            <button className={`tab${mode === "signup" ? " active" : ""}`} onClick={() => { setMode("signup"); setError(""); setMessage(""); }}>
              Sign Up
            </button>
          </div>

          {/* Google OAuth */}
          <button onClick={handleGoogle} disabled={loading} style={{
            width: "100%", padding: "10px", borderRadius: "9px",
            background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-2)",
            color: "var(--t1)", fontSize: "13px", fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
            marginBottom: "18px", transition: "background 0.15s",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
            <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
            <span style={{ fontSize: "11px", color: "var(--t3)", fontWeight: 500 }}>or</span>
            <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {mode === "signup" && (
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--t2)", marginBottom: "5px" }}>Full Name</label>
                <input
                  type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="Jane Smith" required className="field"
                  style={{ padding: "9px 12px", fontSize: "13px" }}
                />
              </div>
            )}
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--t2)", marginBottom: "5px" }}>Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" required className="field"
                style={{ padding: "9px 12px", fontSize: "13px" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--t2)", marginBottom: "5px" }}>Password</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "Min 8 characters" : "••••••••"} required
                minLength={8} className="field" style={{ padding: "9px 12px", fontSize: "13px" }}
              />
            </div>

            {error && (
              <div style={{ padding: "10px 12px", borderRadius: "8px", background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.2)", fontSize: "12px", color: "var(--red)" }}>
                {error}
              </div>
            )}
            {message && (
              <div style={{ padding: "10px 12px", borderRadius: "8px", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", fontSize: "12px", color: "var(--green)" }}>
                {message}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn btn-primary" style={{ padding: "11px", fontSize: "13px", marginTop: "4px" }}>
              {loading ? "Please wait..." : mode === "signin" ? "Sign In" : "Create Account"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", marginTop: "18px", fontSize: "12px", color: "var(--t3)" }}>
          Your data is stored securely and never shared.
        </p>
      </div>
    </div>
  );
}
