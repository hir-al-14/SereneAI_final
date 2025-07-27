import React, { useState } from 'react';
import axios from 'axios';
import './UserDashboard.css';
import Bear from './Bear';

const BACKEND = 'http://localhost:8000';

const UserDashboard = ({ user, logout }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [recommendations, setRecommendations] = useState([]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const newMsg = { sender: 'user', text: input };
    setMessages((prev) => [...prev, newMsg]);
    setInput(''); // clear immediately

    try {
      const chatRes = await axios.post(`${BACKEND}/chat`, { message: input });
      setMessages((prev) => [...prev, { sender: 'ai', text: chatRes.data.response }]);

      const emotionRes = await axios.post(`${BACKEND}/predict`, { text: input });
      const detected = emotionRes.data.detected_problems;

      const crisisRes = await axios.post(`${BACKEND}/crisis`, { message: input });
      const crisisLevel = crisisRes.data.label;

      const recRes = await axios.post(`${BACKEND}/recommendations`, { emotions: detected });
      setRecommendations(recRes.data.recommendations || []);

      await axios.post(`${BACKEND}/log`, {
        name: user.name,
        email: user.email,
        message: input,
        emotions: detected,
        crisis: crisisLevel,
      });
    } catch {
      setMessages((prev) => [...prev, { sender: 'ai', text: '⚠️ Error reaching AI' }]);
    }
  };

  return (
    <div className="dashboard">
      <div className="header">
        <h2>SerenAI</h2>
        <div className="user-info">
          <span>👋 {user.name}</span>
          <button onClick={logout}>Logout</button>
        </div>
      </div>

      <div className="content">
        <div className="chat-section">
          <div className="bear-container"><Bear /></div>

          <div className="chat-box">
            {messages.map((msg, i) => (
              <div key={i} className={`msg ${msg.sender}`}>
                {msg.text}
              </div>
            ))}
          </div>

          <div className="input-row">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="How are you feeling today?"
            />
            <button onClick={sendMessage}>Send</button>
          </div>
        </div>

        {recommendations.length > 0 && (
          <div className="recommendation-panel">
            <h3>🎧 Recommendations</h3>
            <div className="rec-carousel">
              {recommendations.map((item, i) => (
                <div className="rec-card" key={i}>
                  <div style={{ fontSize: "20px", marginRight: "10px" }}>
                    {item.category === "song" ? "🎧" : item.category === "book" ? "📘" : "🎬"}
                  </div>
                  <div>{item.name}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;
