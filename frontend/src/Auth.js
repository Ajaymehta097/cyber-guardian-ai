import { useState } from "react";
import axios from "axios";

axios.defaults.withCredentials = true;

export default function Auth({ onLogin, lang, t }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) return setError("Please fill all fields!");
    if (mode === "register" && !name) return setError("Please enter your name!");
    setLoading(true);
    setError("");
    try {
      const url = mode === "login"
        ? "https://cyber-guardian-ai.onrender.com"
        : "https://cyber-guardian-ai.onrender.com";
      const body = mode === "login"
        ? { email, password }
        : { name, email, password };
      const res = await axios.post(url, body);
      onLogin(res.data.user);
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong!");
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0a0a0a 0%, #0d1117 50%, #0a0a0a 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Segoe UI', sans-serif",
      padding: "20px"
    }}>
      <div style={{
        width: "100%",
        maxWidth: "420px",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h1 style={{
            fontSize: "2.5rem",
            margin: "0 0 8px",
            background: "linear-gradient(90deg, #00e5ff, #7c4dff)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            fontWeight: "800"
          }}>
            🛡️ Cyber Guardian
          </h1>
          <p style={{ color: "#666", margin: 0 }}>
            {mode === "login" ? "Login to your account" : "Create a new account"}
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "20px",
          padding: "32px",
        }}>
          {/* Toggle */}
          <div style={{
            display: "flex",
            background: "rgba(0,0,0,0.3)",
            borderRadius: "12px",
            padding: "4px",
            marginBottom: "24px"
          }}>
            {["login", "register"].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(""); }} style={{
                flex: 1,
                padding: "10px",
                borderRadius: "10px",
                border: mode === m ? "1px solid rgba(0,229,255,0.3)" : "1px solid transparent",
                background: mode === m ? "rgba(0,229,255,0.1)" : "transparent",
                color: mode === m ? "#00e5ff" : "#555",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "0.95rem",
                transition: "all 0.2s"
              }}>
                {m === "login" ? "🔑 Login" : "✨ Register"}
              </button>
            ))}
          </div>

          {/* Fields */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {mode === "register" && (
              <input
                placeholder="👤 Your name"
                value={name}
                onChange={e => setName(e.target.value)}
                style={inputStyle}
              />
            )}
            <input
              placeholder="📧 Email address"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={inputStyle}
            />
            <input
              placeholder="🔒 Password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              style={inputStyle}
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{
              marginTop: "14px",
              padding: "12px",
              background: "rgba(244,67,54,0.1)",
              border: "1px solid rgba(244,67,54,0.3)",
              borderRadius: "10px",
              color: "#f44336",
              fontSize: "0.9rem",
              textAlign: "center"
            }}>
              ❌ {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: "100%",
              marginTop: "20px",
              padding: "14px",
              borderRadius: "12px",
              border: "none",
              background: loading ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg, #00e5ff, #7c4dff)",
              color: loading ? "#444" : "#fff",
              fontSize: "1rem",
              fontWeight: "700",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.3s",
              letterSpacing: "1px"
            }}
          >
            {loading ? "⏳ Please wait..." : mode === "login" ? "🔑 LOGIN" : "✨ REGISTER"}
          </button>

          {/* Divider */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            margin: "20px 0",
            color: "#333"
          }}>
            <div style={{ flex: 1, height: "1px", background: "#222" }} />
            <span style={{ fontSize: "0.8rem" }}>or</span>
            <div style={{ flex: 1, height: "1px", background: "#222" }} />
          </div>

          {/* Google Login */}
          <button
            onClick={() => window.location.href = "https://cyber-guardian-ai.onrender.com"}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "12px",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.03)",
              color: "#fff",
              fontSize: "1rem",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px"
            }}
          >
            <img src="https://www.google.com/favicon.ico" width="18" height="18" alt="G" />
            Continue with Google
          </button>
        </div>

        <p style={{ textAlign: "center", color: "#333", fontSize: "0.8rem", marginTop: "20px" }}>
          🛡️ Cyber Guardian AI • Secure & Private
        </p>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(0,0,0,0.4)",
  color: "#fff",
  fontSize: "0.95rem",
  outline: "none",
  boxSizing: "border-box",
  transition: "border 0.3s"
};