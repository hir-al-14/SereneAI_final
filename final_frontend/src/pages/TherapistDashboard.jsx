// src/pages/TherapistDashboard.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import "./TherapistDashboard.css";

const TherapistDashboard = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get("http://localhost:8000/log_user/logs")
      .then(res => {
        setLogs(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching logs:", err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="therapist-container">
      <h1>Therapist Dashboard</h1>
      {loading ? (
        <p>Loading logs...</p>
      ) : logs.length === 0 ? (
        <p>No patient records yet.</p>
      ) : (
        <table className="log-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Message</th>
              <th>Emotion</th>
              <th>Score</th>
              <th>Crisis</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, idx) => (
              <tr
                key={idx}
                className={log.crisis === "CRISIS" ? "crisis-row" : ""}
              >
                <td>{log.name}</td>
                <td>{log.email}</td>
                <td>{log.message}</td>
                <td>{log.emotion}</td>
                <td>{log.score}</td>
                <td>{log.crisis}</td>
                <td>{log.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default TherapistDashboard;
