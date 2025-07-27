import React, { useEffect, useState } from "react";
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
ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Legend,
  Tooltip
);

const EMOTION_COLORS = [
  "#ff6384", // red
  "#36a2eb", // blue
  "#4bc0c0", // teal
  "#9966ff", // purple
  "#ffcd56", // yellow
  "#ff9f40", // orange
  "#8dd3c7", // light teal
  "#d62728", // dark red
  "#2ca02c", // green
  "#1f77b4", // navy
];

export default function TherapistDashboard() {
  const [logs, setLogs] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    fetch("http://localhost:8000/logs")
      .then((res) => res.json())
      .then((data) => setLogs(data.reverse()));
  }, []);

  const getPatientSummaries = () => {
    const summaries = {};
    logs.forEach((log) => {
      const { name, emotions, crisis } = log;
      if (!summaries[name]) {
        summaries[name] = {
          sessions: 0,
          lastMessage: log.message,
          emotionScores: {},
        };
      }
      summaries[name].sessions += 1;
      const sessionNum = summaries[name].sessions;
      emotions.forEach((emotion) => {
        if (!summaries[name].emotionScores[emotion]) {
          summaries[name].emotionScores[emotion] = [];
        }
        const score = crisis === "CRISIS" ? 10 : crisis === "HIGH_RISK" ? 7 : 3;
        summaries[name].emotionScores[emotion].push({ session: sessionNum, score });
      });
    });
    return summaries;
  };

  const summaries = getPatientSummaries();
  const email = localStorage.getItem("email") || "";

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  const chartData = (user) => {
    const emotionScores = summaries[user]?.emotionScores || {};
    const allSessions = new Set();
    Object.values(emotionScores).forEach((points) => {
      points.forEach((pt) => allSessions.add(pt.session));
    });
    const sortedSessions = Array.from(allSessions).sort((a, b) => a - b);

    const datasets = Object.keys(emotionScores).map((emotion, index) => {
      const sessionMap = new Map(
        emotionScores[emotion].map((e) => [e.session, e.score])
      );
      const data = sortedSessions.map((s) => sessionMap.get(s) || null);
      return {
        label: `${emotion} Risk Score`,
        data,
        borderColor: EMOTION_COLORS[index % EMOTION_COLORS.length],
        backgroundColor: EMOTION_COLORS[index % EMOTION_COLORS.length] + "33",
        fill: false,
        tension: 0.3,
      };
    });

    return {
      labels: sortedSessions.map((s) => `Session ${s}`),
      datasets,
    };
  };

  return (
    <div className="therapist-dashboard">
      <div className="dashboard-header">
        <h2>
          👨‍⚕️ Therapist Dashboard - <span>{email}</span>
        </h2>
        <button onClick={handleLogout}>Logout</button>
      </div>

      <h3 className="section-title">👥 Patient Overview</h3>

      <div className="card-container">
        {Object.keys(summaries).map((user, index) => (
          <div
            className="patient-card"
            key={index}
            onClick={() => setSelectedUser(user)}
          >
            <div className="card-title">{user}</div>
            <div className="card-details">
              <p>
                🕒 Last Msg: <i>{summaries[user].lastMessage.slice(0, 50)}...</i>
              </p>
              <p>📊 Sessions: {summaries[user].sessions}</p>
              <p>
                🤔 Tags: {Object.keys(summaries[user].emotionScores).join(", ")}
              </p>
              <p>
                📈 Status: <b>View Below</b>
              </p>
            </div>
          </div>
        ))}
      </div>

      {selectedUser && (
        <div className="line-graph">
          <h3>📊 Emotional Progress for {selectedUser}</h3>
          <Line data={chartData(selectedUser)} />
        </div>
      )}
    </div>
  );
}
