import React, { useState } from "react";
import axios from "axios";

const UserDashboard = ({ user }) => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = { sender: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);

    const res = await axios.post("http://localhost:8000/chat/message", {
      message: input,
      name: user.name,
      email: user.email,
    });

    const botMsg = { sender: "bot", text: res.data.response };
    setMessages((prev) => [...prev, botMsg]);
    setInput("");
  };

  return (
    <div className="dashboard">
      <h2>Hello, {user.name}</h2>
      <div className="chat-box">
        {messages.map((msg, i) => (
          <div key={i} className={msg.sender}>
            <p>{msg.text}</p>
          </div>
        ))}
      </div>
      <div className="input-box">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Talk to SerenAI..."
        />
        <button onClick={handleSend}>Send</button>
      </div>
    </div>
  );
};

export default UserDashboard;
