import React, { useState } from 'react';
import axios from 'axios';
import './UserDashboard.css';
import Bear from './Bear';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import Logo from '../assets/logo.png';
import Icon from '../assets/icon.png';

const BACKEND = 'http://localhost:8000';

const UserDashboard = ({ user }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const navigate = useNavigate();
  const { logout } = useAuth0();

  const sendMessage = async () => {
    if (!input.trim()) return;

    const newMsg = { sender: 'user', text: input };
    setMessages((prev) => [...prev, newMsg]);
    setInput('');

    try {
      // 1. Chat
      const chatRes = await axios.post(`${BACKEND}/chat`, { message: input });
      setMessages((prev) => [...prev, { sender: 'ai', text: chatRes.data.response }]);

      // 2. Emotion Detection
      let detected = [];
      try {
        const emotionRes = await axios.post(`${BACKEND}/predict`, { text: input });
        detected = emotionRes.data.detected_problems || [];
      } catch (e) {
        console.error('Emotion detection failed:', e.message);
      }

      // 3. Crisis Detection
      let crisisLevel = 'NORMAL';
      try {
        const crisisRes = await axios.post(`${BACKEND}/crisis`, { message: input });
        crisisLevel = crisisRes.data.label;
      } catch (e) {
        console.error('Crisis detection failed:', e.message);
      }

      // 4. Recommendations
      try {
        const recRes = await axios.post(`${BACKEND}/recommendations`, { emotions: detected });
        setRecommendations(recRes.data.recommendations || []);
      } catch (e) {
        console.error('Recommendation fetching failed:', e.message);
      }

      // 5. Logging
      await axios.post(`${BACKEND}/log`, {
        name: user.name,
        email: user.email,
        message: input,
        emotions: detected,
        crisis: crisisLevel,
      });

    } catch (e) {
      console.error('Main chat error:', e.message);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: '🤖 I’m here for you… just having some technical difficulties right now. Please try again shortly.',
        },
      ]);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('role');
    logout({ returnTo: window.location.origin });
  };

  return (
    <div className="serenai-container">
      <div className="sidebar">
        <div className="logo-section">
          <img src={Logo} alt="SerenAI Logo" className="logo" />
        </div>
        <div className="rec-title">FEEL BETTER 💭</div>
        <div className="rec-list">
          {recommendations.map((item, i) => (
            <div className="rec-item" key={i}>
              {item.category === 'song' ? '🎧' : item.category === 'book' ? '📘' : '🎬'} {item.name}
            </div>
          ))}
        </div>
      </div>

      <div className="chat-container">
        <div className="chat-header">
          <div className="left">
            <img src={Icon} alt="icon" className="chat-icon" />
            <div>
              <div className="chat-title">SerenAI</div>
              <div className="online-status">Online</div>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>

        <div className="chat-body">
          <div className="chat-box">
            {messages.map((msg, i) => (
              <div key={i} className={`chat-bubble ${msg.sender}`}>{msg.text}</div>
            ))}
          </div>

          <div className="chat-input-row">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Write your message..."
            />
            <button className="send-btn" onClick={sendMessage}>Send</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
