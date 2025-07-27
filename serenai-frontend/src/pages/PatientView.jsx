// === PatientView.jsx ===
import React, { useState } from "react";
import axios from "axios";
import Lottie from "lottie-react";
import bearAnimation from "../assets/bear.json";
import "./PatientView.css";

function PatientView() {
  const [messages, setMessages] = useState([
    { from: "bot", text: "Hello! How can I help you today?" },
  ]);
  const [input, setInput] = useState("");

  const sendMessage = async () => {
    if (!input.trim()) return;

    const newMessages = [...messages, { from: "user", text: input }];
    setMessages(newMessages);
    setInput("");

    try {
      const res = await axios.post("http://localhost:8000/chat/", {
        message: input,
      });
      const reply = res.data.response;
      setMessages([...newMessages, { from: "bot", text: reply }]);
    } catch (error) {
      setMessages([...newMessages, { from: "bot", text: "Error reaching AI" }]);
    }
  };

  return (
    <div className="patient-container">
      <div className="chat-section">
        <div className="messages">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`message ${msg.from === "user" ? "user" : "bot"}`}
            >
              {msg.text}
            </div>
          ))}
        </div>
        <div className="input-area">
          <input
            type="text"
            className="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
          />
          <button className="send-button" onClick={sendMessage}>
            Send
          </button>
        </div>
      </div>
      <div className="sidebar">
        <Lottie animationData={bearAnimation} className="bear-lottie" />
        <div className="recommendations">
          <h3>Recommended</h3>
          <ul>
            <li>📚 Book: The Happiness Project</li>
            <li>🎵 Song: Weightless – Marconi Union</li>
            <li>🎬 Movie: Inside Out</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default PatientView;