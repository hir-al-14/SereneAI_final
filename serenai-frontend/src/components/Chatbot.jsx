import React, { useState } from "react"
import "./Chatbot.css"
import axios from "axios"

const Chatbot = () => {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState("")

  const handleSend = async () => {
    if (!input.trim()) return

    const newMessages = [...messages, { sender: "user", text: input }]
    setMessages(newMessages)
    setInput("")

    try {
      const res = await axios.post("http://localhost:8000/chat", { message: input })
      const reply = res.data.response
      setMessages([...newMessages, { sender: "bot", text: reply }])
    } catch (err) {
      setMessages([...newMessages, { sender: "bot", text: "Something went wrong." }])
    }
  }

  return (
    <div className="chatbot-container">
      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.sender}`}>
            {msg.text}
          </div>
        ))}
      </div>
      <div className="chat-input">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your thoughts here..."
        />
        <button onClick={handleSend}>Send</button>
      </div>
    </div>
  )
}

export default Chatbot
