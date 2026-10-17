"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

async function post(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

function Shell({ children }) {
  return (
    <div className="wrap">
      <div className="brand">
        <span className="brand-mark">🔐</span> Secure Tasks
      </div>
      {children}
    </div>
  );
}

const COPY = {
  login: { title: "Welcome back! 👋", sub: "Log in to your account.", button: "Log in" },
  register: { title: "Join us! 🎉", sub: "Create your account in under a minute.", button: "Create account" },
  "2fa": { title: "One more step! 🔐", sub: "Enter the 6-digit code from your authenticator app.", button: "Verify code" },
};

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState("login"); // login | register | qr | 2fa
  const [form, setForm] = useState({ username: "", email: "", password: "", code: "" });
  const [qr, setQr] = useState(null);
  const [secret, setSecret] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);

    if (mode === "register") {
      const { ok, data } = await post("/api/auth/register", form);
      if (!ok) setError(data.error || "Something went wrong.");
      else {
        setQr(data.qr);
        setSecret(data.secret);
        setMode("qr");
      }
    } else if (mode === "login") {
      const { ok, data } = await post("/api/auth/login", form);
      if (!ok) setError(data.error || "Something went wrong.");
      else setMode("2fa");
    } else if (mode === "2fa") {
      const { ok, data } = await post("/api/auth/verify-2fa", { code: form.code });
      if (!ok) setError(data.error || "Something went wrong.");
      else router.push("/dashboard");
    }
    setBusy(false);
  }

  if (mode === "qr")
    return (
      <Shell>
      <div className="card">
        <h1>You're in! 🎊 Now lock it down.</h1>
        <p className="sub">
          Scan this QR code with Google Authenticator. You'll use it every time you log in.
        </p>
        <img className="qr" src={qr} alt="2FA QR code" />
        <p>Can't scan? Type this key into the app instead:</p>
        <code>{secret}</code>
        <button
          onClick={() => {
            setMode("login");
            setQr(null);
            setSecret("");
          }}
        >
          I've added it, go to log in
        </button>
      </div>
      </Shell>
    );

  const copy = COPY[mode];

  return (
    <Shell>
    <div className="card">
      <h1>{copy.title}</h1>
      <p className="sub">{copy.sub}</p>

      <form onSubmit={submit}>
        {mode !== "2fa" && (
          <>
            <label>Username</label>
            <input value={form.username} onChange={set("username")} autoComplete="username" required />
          </>
        )}
        {mode === "register" && (
          <>
            <label>Email</label>
            <input type="email" value={form.email} onChange={set("email")} required />
          </>
        )}
        {mode !== "2fa" && (
          <>
            <label>Password</label>
            <input
              type="password"
              value={form.password}
              onChange={set("password")}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
            />
          </>
        )}
        {mode === "2fa" && (
          <>
            <label>6-digit code</label>
            <input
              value={form.code}
              onChange={set("code")}
              inputMode="numeric"
              maxLength={6}
              autoComplete="one-time-code"
              required
            />
          </>
        )}

        {error && <div className="error">{error}</div>}
        <button disabled={busy}>{busy ? "Working on it..." : copy.button}</button>
      </form>

      {mode === "login" && (
        <button className="link" onClick={() => { setMode("register"); setError(""); }}>
          New here? Create an account
        </button>
      )}
      {mode !== "login" && (
        <button className="link" onClick={() => { setMode("login"); setError(""); }}>
          Back to log in
        </button>
      )}
    </div>
    </Shell>
  );
}
