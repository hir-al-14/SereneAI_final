import React, { useEffect, useMemo, useState } from "react";
import "./TherapistDashboard.css";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Legend,
  Tooltip,
} from "chart.js";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate } from "react-router-dom";

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Legend, Tooltip);

const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

const EMOTION_COLORS = [
  "#ff6384", "#36a2eb", "#4bc0c0", "#9966ff", "#ffcd56",
  "#ff9f40", "#8dd3c7", "#d62728", "#2ca02c", "#1f77b4",
];

// --- NEW: normalize helpers ---
const normalizeCrisis = (val) => {
  const v = String(val ?? "").trim().toUpperCase();
  if (["CRISIS", "HIGH_RISK", "NORMAL"].includes(v)) return v;
  if (["1", "TRUE", "YES", "Y"].includes(v)) return "CRISIS";
  if (["0", "FALSE", "NO", "N"].includes(v)) return "NORMAL";
  // catch common typos
  if (v.includes("CRIS")) return "CRISIS";
  if (v.includes("RISK")) return "HIGH_RISK";
  return v || "NORMAL";
};

export default function TherapistDashboard() {
  const [logs, setLogs] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [q, setQ] = useState("");

  const { logout } = useAuth0();
  const navigate = useNavigate();

  // Load logs + simple polling so CRISIS shows up quickly
  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        const res = await fetch(`${BACKEND}/logs`);
        const data = await res.json();
        if (!alive) return;
        setLogs((Array.isArray(data) ? data : []).reverse());
      } catch (e) {
        console.error("Failed to load logs:", e?.message || e);
      }
    };

    load();
    const id = setInterval(load, 5000); // poll every 5s
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  // Build summaries with CRISIS normalization
  const summaries = useMemo(() => {
    const sum = {};
    for (const log of logs) {
      const name = log?.name || "Unknown";
      const message = log?.message || "";
      const emotions = Array.isArray(log?.emotions) ? log.emotions : [];
      const crisisRaw = log?.crisis;
      const crisis = normalizeCrisis(crisisRaw); // <-- normalize here

      if (!sum[name]) {
        sum[name] = { sessions: 0, lastMessage: message, emotionScores: {}, lastCrisis: crisis };
      }

      sum[name].sessions += 1;
      sum[name].lastMessage = message || sum[name].lastMessage;
      sum[name].lastCrisis = crisis || sum[name].lastCrisis;

      const sessionNum = sum[name].sessions;
      const riskScore = crisis === "CRISIS" ? 10 : crisis === "HIGH_RISK" ? 7 : 3;

      emotions.forEach((emotion) => {
        if (!sum[name].emotionScores[emotion]) sum[name].emotionScores[emotion] = [];
        sum[name].emotionScores[emotion].push({ session: sessionNum, score: riskScore });
      });
    }
    return sum;
  }, [logs]);

  const users = useMemo(
    () => Object.keys(summaries).filter((n) => n.toLowerCase().includes(q.toLowerCase())),
    [summaries, q]
  );

  const email = localStorage.getItem("email") || "";

  const handleLogout = () => {
    localStorage.clear();
    if (logout) {
      logout({ returnTo: window.location.origin });
    } else {
      navigate("/");
    }
  };

  const chartData = (user) => {
    const emotionScores = summaries[user]?.emotionScores || {};
    const allSessions = new Set();
    Object.values(emotionScores).forEach((points) => points.forEach((pt) => allSessions.add(pt.session)));
    const sortedSessions = Array.from(allSessions).sort((a, b) => a - b);

    const datasets = Object.keys(emotionScores).map((emotion, index) => {
      const sessionMap = new Map(emotionScores[emotion].map((e) => [e.session, e.score]));
      const data = sortedSessions.map((s) => sessionMap.get(s) ?? null);
      return {
        label: `${emotion} Risk`,
        data,
        borderColor: EMOTION_COLORS[index % EMOTION_COLORS.length],
        backgroundColor: EMOTION_COLORS[index % EMOTION_COLORS.length] + "33",
        fill: false,
        tension: 0.3,
        spanGaps: true,
      };
    });

    return { labels: sortedSessions.map((s) => `Session ${s}`), datasets };
  };

  const crisisBadge = (statusRaw) => {
    const status = normalizeCrisis(statusRaw);
    return status === "CRISIS" ? "crisis" : status === "HIGH_RISK" ? "high" : "normal";
  };

  return (
    <div className="therapist-surface">
      <div className="therapist-dashboard">
        <div className="dashboard-header">
          <h2>
            👨‍⚕️ Therapist Dashboard - <span>{email}</span>
          </h2>
          <div className="header-controls">
            <input
              className="search"
              placeholder="Search patient…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <button type="button" onClick={handleLogout}>Logout</button>
          </div>
        </div>

        <h3 className="section-title">👥 Patient Overview</h3>

        <div className="card-container">
          {users.length === 0 && (
            <div className="empty-state">No patients found. Try clearing your search.</div>
          )}

          {users.map((user, index) => (
            <div
              className="patient-card"
              key={index}
              onClick={() => setSelectedUser(user)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && setSelectedUser(user)}
            >
              <div className="card-title">
                {user}
                <span className={`badge ${crisisBadge(summaries[user].lastCrisis)}`}>
                  {normalizeCrisis(summaries[user].lastCrisis)}
                </span>
              </div>
              <div className="card-details">
                <p>
                  🕒 Last Msg:{" "}
                  <i>
                    {(summaries[user].lastMessage || "").slice(0, 80)}
                    {(summaries[user].lastMessage || "").length > 80 ? "…" : ""}
                  </i>
                </p>
                <p>📊 Sessions: {summaries[user].sessions}</p>
                <p>
                  🤔 Tags:{" "}
                  {Object.keys(summaries[user].emotionScores).join(", ") || "—"}
                </p>
                <p>📈 Status: <b>View Below</b></p>
              </div>
            </div>
          ))}
        </div>

        {selectedUser && (
          <>
            {normalizeCrisis(summaries[selectedUser]?.lastCrisis) === "CRISIS" && (
              <div className="crisis-alert" role="alert">
                🚨 Recent CRISIS detected for <b>{selectedUser}</b>. Consider reaching out immediately.
                <div>
                  <button
                    className="call-btn"
                    onClick={() => alert("Initiate outreach workflow…")}
                  >
                    Call Now
                  </button>
                </div>
              </div>
            )}

            <div className="line-graph">
              <h3>📊 Emotional Progress for {selectedUser}</h3>
              <Line data={chartData(selectedUser)} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
