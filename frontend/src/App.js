import { useState, useEffect } from "react";
import axios from "axios";
import Auth from "./Auth";

function HistorySection() {
  const [history, setHistory] = useState([]);
  const [show, setShow] = useState(false);

  const loadHistory = async () => {
    try {
      const res = await axios.get("http://localhost:5000/history", { withCredentials: true });
      setHistory(res.data);
      setShow(true);
    } catch (err) {
      console.error(err);
    }
  };

  const getColor = (verdict) => {
    if (verdict === "Safe") return "#00c853";
    if (verdict === "Warning") return "#ff9800";
    return "#f44336";
  };

  return (
    <div style={{ maxWidth: "650px", margin: "24px auto 0" }}>
      <button
        onClick={show ? () => setShow(false) : loadHistory}
        style={{
          width: "100%",
          padding: "14px",
          borderRadius: "12px",
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.03)",
          color: "#888",
          cursor: "pointer",
          fontSize: "0.95rem",
          fontWeight: "600",
        }}
      >
        {show ?  "🔼 Hide History" : "🕘 View Scan History"}
      </button>

      {show && (
        <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
          {history.length === 0 ? (
            <div style={{
              textAlign: "center", padding: "30px", color: "#555",
              background: "rgba(255,255,255,0.02)", borderRadius: "12px",
              border: "1px solid rgba(255,255,255,0.05)"
            }}>
              No scan history yet
            </div>
          ) : (
            history.map(h => (
              <div key={h.id} style={{
                background: "rgba(255,255,255,0.03)",
                border: `1px solid ${getColor(h.final_verdict)}33`,
                borderLeft: `4px solid ${getColor(h.final_verdict)}`,
                borderRadius: "12px",
                padding: "14px 16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px"
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    color: "#aaa", fontSize: "0.85rem",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
                  }}>
                    {h.type === "url" ? "🔗" : "💬"} {h.input}
                  </div>
                  <div style={{ color: "#555", fontSize: "0.75rem", marginTop: "4px" }}>
                    {new Date(h.scanned_at).toLocaleString('hi-IN')}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ color: getColor(h.final_verdict), fontWeight: "700", fontSize: "0.9rem" }}>
                    {h.final_verdict === "Safe" ? "✅" : h.final_verdict === "Warning" ? "⚠️" : "🚨"} {h.final_verdict}
                  </div>
                  <div style={{ color: "#555", fontSize: "0.75rem" }}>
                    Score: {h.final_score}/100
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [input, setInput] = useState("");
  const [type, setType] = useState("url");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);

  useEffect(() => {
    axios.get("http://localhost:5000/auth/me", { withCredentials: true })
      .then(res => setUser(res.data.user))
      .catch(() => setUser(null));
  }, []);

  if (!user) return <Auth onLogin={setUser} />;

  const handleScan = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setResult(null);
    setError("");
    try {
      const res = await axios.post("http://localhost:5000/scan", { input, type }, { withCredentials: true });
      setResult(res.data);
    } catch (err) {
      setError("❌ Scan failed! Is the server running?");
    }
    setLoading(false);
  };

  const getColor = (verdict) => {
    if (verdict === "Safe") return "#00c853";
    if (verdict === "Warning") return "#ff9800";
    return "#f44336";
  };

  const getEmoji = (verdict) => {
    if (verdict === "Safe") return "✅";
    if (verdict === "Warning") return "⚠️";
    return "🚨";
  };

  const getBg = (verdict) => {
    if (verdict === "Safe") return "rgba(0,200,83,0.08)";
    if (verdict === "Warning") return "rgba(255,152,0,0.08)";
    return "rgba(244,67,54,0.08)";
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0a0a0a 0%, #0d1117 50%, #0a0a0a 100%)",
      color: "#fff",
      fontFamily: "'Segoe UI', sans-serif",
      padding: "20px",
    }}>

      {/* Top Bar - User Info */}
      <div style={{
        maxWidth: "650px",
        margin: "0 auto 20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "12px",
        padding: "12px 20px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "36px", height: "36px", borderRadius: "50%",
            background: "linear-gradient(135deg, #00e5ff, #7c4dff)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: "700", fontSize: "1rem"
          }}>
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ color: "#fff", fontWeight: "600", fontSize: "0.95rem" }}>{user?.name}</div>
            <div style={{ color: "#666", fontSize: "0.75rem" }}>{user?.email}</div>
          </div>
        </div>
        <button
          onClick={async () => {
            await axios.post("http://localhost:5000/auth/logout", {}, { withCredentials: true });
            setUser(null);
            setResult(null);
          }}
          style={{
            padding: "8px 16px", borderRadius: "8px",
            border: "1px solid rgba(244,67,54,0.3)",
            background: "rgba(244,67,54,0.1)",
            color: "#f44336", cursor: "pointer",
            fontSize: "0.85rem", fontWeight: "600"
          }}
        >
          🚪 Logout
        </button>
      </div>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <div style={{
          display: "inline-block",
          background: "rgba(0,229,255,0.1)",
          border: "1px solid rgba(0,229,255,0.2)",
          borderRadius: "50px",
          padding: "6px 18px",
          fontSize: "0.8rem",
          color: "#00e5ff",
          marginBottom: "16px",
          letterSpacing: "2px"
        }}>
          AI POWERED • 3-LAYER SECURITY
        </div>
        <h1 style={{
          fontSize: "3rem", margin: "0 0 8px",
          background: "linear-gradient(90deg, #00e5ff, #7c4dff)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          fontWeight: "800"
        }}>
          🛡️ Cyber Guardian
        </h1>
        <p style={{ color: "#666", fontSize: "1rem", margin: 0 }}>
          Protect yourself from Scams, Phishing & Fraud — Check URLs and SMS
        </p>
      </div>

      {/* Stats Bar */}
      <div style={{
        maxWidth: "650px", margin: "0 auto 24px",
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px"
      }}>
        {[
          { label: "Google Safe Browsing", icon: "🔍" },
          { label: "VirusTotal (70+ engines)", icon: "🦠" },
          { label: "Groq AI Analysis", icon: "🤖" },
        ].map(s => (
          <div key={s.label} style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "12px", padding: "12px", textAlign: "center"
          }}>
            <div style={{ fontSize: "1.4rem" }}>{s.icon}</div>
            <div style={{ fontSize: "0.7rem", color: "#666", marginTop: "4px" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Input Card */}
      <div style={{
        maxWidth: "650px", margin: "0 auto",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "20px", padding: "30px",
      }}>
        {/* Toggle */}
        <div style={{
          display: "flex", gap: "8px", marginBottom: "20px",
          background: "rgba(0,0,0,0.3)", borderRadius: "12px", padding: "4px"
        }}>
          {[
            { key: "url", label: "🔗 URL Check" },
            { key: "sms", label: "💬 SMS Check" }
          ].map(t => (
            <button key={t.key} onClick={() => setType(t.key)} style={{
              flex: 1, padding: "12px", borderRadius: "10px",
              border: type === t.key ? "1px solid rgba(0,229,255,0.3)" : "1px solid transparent",
              cursor: "pointer", fontWeight: "600", fontSize: "0.95rem",
              background: type === t.key ? "linear-gradient(135deg, #00e5ff22, #7c4dff22)" : "transparent",
              color: type === t.key ? "#00e5ff" : "#555",
              transition: "all 0.3s"
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Textarea */}
        <textarea
          rows={4}
          placeholder={type === "url"
            ? "🔗 Paste URL here...\nExample: http://sbi-login-verify.tk"
            : "💬 Paste SMS here...\nExample: URGENT: Your account will be blocked..."
          }
          value={input}
          onChange={e => setInput(e.target.value)}
          style={{
            width: "100%", padding: "16px", borderRadius: "12px",
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(0,0,0,0.4)", color: "#fff",
            fontSize: "0.95rem", resize: "vertical", outline: "none",
            boxSizing: "border-box", lineHeight: "1.6",
          }}
        />

        {/* Scan Button */}
        <button
          onClick={handleScan}
          disabled={loading || !input.trim()}
          style={{
            width: "100%", marginTop: "16px", padding: "16px",
            borderRadius: "12px", border: "none",
            background: loading || !input.trim()
              ? "rgba(255,255,255,0.05)"
              : "linear-gradient(135deg, #00e5ff, #7c4dff)",
            color: loading || !input.trim() ? "#444" : "#fff",
            fontSize: "1.1rem", fontWeight: "700",
            cursor: loading || !input.trim() ? "not-allowed" : "pointer",
            letterSpacing: "1px"
          }}
        >
          {loading ? "⏳ Scanning... please wait (15-20 sec)" : "🔍 SCAN NOW"}
        </button>

        {error && (
          <div style={{
            marginTop: "12px", padding: "12px",
            background: "rgba(244,67,54,0.1)",
            border: "1px solid rgba(244,67,54,0.3)",
            borderRadius: "10px", color: "#f44336", textAlign: "center"
          }}>
            {error}
          </div>
        )}
      </div>

      {/* Result */}
      {result && (
        <div style={{
          maxWidth: "650px", margin: "24px auto 0",
          background: getBg(result.final_verdict),
          border: `1px solid ${getColor(result.final_verdict)}44`,
          borderRadius: "20px", padding: "30px",
          borderLeft: `4px solid ${getColor(result.final_verdict)}`
        }}>
          <div style={{ textAlign: "center", marginBottom: "28px" }}>
            <div style={{ fontSize: "4rem", marginBottom: "8px" }}>
              {getEmoji(result.final_verdict)}
            </div>
            <h2 style={{
              fontSize: "2.2rem", color: getColor(result.final_verdict),
              margin: "0 0 8px", fontWeight: "800"
            }}>
              {result.final_verdict.toUpperCase()}
            </h2>
            <p style={{ color: "#aaa", margin: 0, fontSize: "0.95rem" }}>
              {result.consensus}
            </p>
          </div>

          {/* Score Bar */}
          <div style={{
            background: "rgba(0,0,0,0.3)", borderRadius: "12px",
            padding: "16px", marginBottom: "20px"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ color: "#888", fontSize: "0.9rem" }}>Scam Score</span>
              <span style={{ color: getColor(result.final_verdict), fontWeight: "700", fontSize: "1.1rem" }}>
                {result.final_score}/100
              </span>
            </div>
            <div style={{ background: "#222", borderRadius: "10px", height: "8px", overflow: "hidden" }}>
              <div style={{
                width: `${result.final_score}%`, height: "8px", borderRadius: "10px",
                background: `linear-gradient(90deg, ${getColor(result.final_verdict)}88, ${getColor(result.final_verdict)})`,
                transition: "width 1.2s ease"
              }} />
            </div>
          </div>

          {/* Detail Cards */}
          <div style={{ display: "grid", gap: "10px", marginBottom: "20px" }}>
            {[
              { icon: "🎯", label: "Intent", value: result.intent },
              { icon: "🧠", label: "Psychological Tricks", value: result.psychological_tricks?.join(", ") },
              { icon: "🏦", label: "Impersonating", value: result.impersonating },
              { icon: "💬", label: "Explanation", value: result.simple_explanation },
              { icon: "✅", label: "Action", value: result.action_advised },
            ].filter(d => d.value && d.value !== "none").map(d => (
              <div key={d.label} style={{
                background: "rgba(0,0,0,0.3)", borderRadius: "12px",
                padding: "14px 16px", display: "flex", gap: "12px", alignItems: "flex-start"
              }}>
                <span style={{ fontSize: "1.2rem" }}>{d.icon}</span>
                <div>
                  <div style={{ color: "#666", fontSize: "0.78rem", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "1px" }}>
                    {d.label}
                  </div>
                  <div style={{ color: "#eee", fontSize: "0.95rem", lineHeight: "1.5" }}>
                    {d.value}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Source Breakdown */}
          <div>
            <div style={{ color: "#555", fontSize: "0.8rem", marginBottom: "10px", letterSpacing: "1px" }}>
              📡 SOURCE BREAKDOWN
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
              {[
                { name: "GSB", value: result.gsb?.safe ? "✅ Clean" : "🚨 Threat" },
                { name: "VirusTotal", value: result.vt?.available ? `${result.vt.malicious} malicious` : "N/A" },
                { name: "Groq AI", value: result.groq_score + "/100" },
              ].map(s => (
                <div key={s.name} style={{
                  background: "rgba(0,0,0,0.3)", borderRadius: "12px",
                  padding: "12px", textAlign: "center",
                  border: "1px solid rgba(255,255,255,0.05)"
                }}>
                  <div style={{ color: "#00e5ff", fontWeight: "700", fontSize: "0.85rem" }}>{s.name}</div>
                  <div style={{ color: "#aaa", fontSize: "0.8rem", marginTop: "6px" }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* History */}
      <HistorySection />

      {/* Security Tips */}
<div style={{
  maxWidth: "650px",
  margin: "24px auto 0",
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "20px",
  padding: "24px"
}}>
  <div style={{
    color: "#00e5ff",
    fontWeight: "700",
    fontSize: "1rem",
    marginBottom: "16px",
    letterSpacing: "1px"
  }}>
    🛡️ SECURITY TIPS
  </div>
  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
    {[
      { icon: "🔴", tip: "Never click links with suspicious endings like .tk, .ml, .xyz, .cf, .ga" },
      { icon: "🔴", tip: "If a message says 'Your account will be blocked', it's almost always a scam" },
      { icon: "🔴", tip: "Banks never ask for OTP, PIN or password over SMS or call" },
      { icon: "🔴", tip: "Avoid URLs with too many hyphens like 'sbi-bank-login-verify-now.tk'" },
      { icon: "🔴", tip: "Always check if the site uses HTTPS — HTTP is not secure" },
      { icon: "🟡", tip: "If you won a prize you never entered, it's 100% a scam" },
      { icon: "🟡", tip: "Government agencies like TRAI, RBI never threaten to disconnect your number" },
      { icon: "🟡", tip: "Misspelled brand names like 'Paytem' or 'Amaz0n' are red flags" },
      { icon: "🟡", tip: "Urgent language like 'Act now', 'Last chance', 'Expires today' are manipulation tactics" },
      { icon: "🟡", tip: "Always verify by calling the official customer care number" },
      { icon: "🟢", tip: "Legitimate websites always have a verified SSL certificate (padlock icon)" },
      { icon: "🟢", tip: "When in doubt, go directly to the official website — don't click links" },
      { icon: "🟢", tip: "Report scam calls to Cyber Crime helpline: 1930" },
      { icon: "🟢", tip: "Enable two-factor authentication on all your banking apps" },
      { icon: "🟢", tip: "Regularly check your bank statements for unauthorized transactions" },
    ].map((item, i) => (
      <div key={i} style={{
        display: "flex",
        gap: "12px",
        alignItems: "flex-start",
        background: "rgba(0,0,0,0.2)",
        borderRadius: "10px",
        padding: "12px 14px",
        border: "1px solid rgba(255,255,255,0.04)"
      }}>
        <span style={{ fontSize: "1rem", flexShrink: 0 }}>{item.icon}</span>
        <span style={{ color: "#bbb", fontSize: "0.88rem", lineHeight: "1.5" }}>
          {item.tip}
        </span>
      </div>
    ))}
  </div>

  {/* Legend */}
  <div style={{
    display: "flex",
    gap: "20px",
    marginTop: "16px",
    padding: "12px",
    background: "rgba(0,0,0,0.2)",
    borderRadius: "10px",
    justifyContent: "center"
  }}>
    {[
      { icon: "🔴", label: "High Risk" },
      { icon: "🟡", label: "Medium Risk" },
      { icon: "🟢", label: "Best Practice" },
    ].map(l => (
      <div key={l.label} style={{
        display: "flex", alignItems: "center", gap: "6px",
        color: "#666", fontSize: "0.8rem"
      }}>
        <span>{l.icon}</span>
        <span>{l.label}</span>
      </div>
    ))}
  </div>
</div>

      {/* Footer */}
      <div style={{ textAlign: "center", marginTop: "40px", color: "#333", fontSize: "0.8rem" }}>
        🛡️ Cyber Guardian AI • Powered by Groq + VirusTotal + Google Safe Browsing
      </div>
    </div>
  );
}