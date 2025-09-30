import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import './UserDashboard.css';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import Logo from '../assets/logo.png';
import Icon from '../assets/icon.png';

const BACKEND = import.meta.env?.VITE_BACKEND_URL || 'http://localhost:8000';

const catIcon = (c) => (c === 'song' ? '🎧' : c === 'book' ? '📘' : '🎬');

const normalizeCategory = (raw) => {
  const s = String(raw || '').toLowerCase().trim();
  if (s.startsWith('mov')) return 'movie';
  if (s.startsWith('boo')) return 'book';
  if (s.startsWith('son') || s === 'music' || s === 'track') return 'song';
  return 'movie';
};

const flattenRecs = (payload) => {
  // accepts {recommendations:[{name,category}]} or {movies:[],books:[],songs:[]}
  if (!payload) return [];
  if (payload.recommendations && Array.isArray(payload.recommendations)) {
    return payload.recommendations
      .map((r) => ({ name: r?.name ?? '', category: normalizeCategory(r?.category) }))
      .filter((r) => r.name);
  }
  const out = [];
  (payload.movies || []).forEach((t) => out.push({ name: t, category: 'movie' }));
  (payload.books || []).forEach((t) => out.push({ name: t, category: 'book' }));
  (payload.songs || []).forEach((t) => out.push({ name: t, category: 'song' }));
  return out.filter((r) => r.name);
};

export default function UserDashboard({ user }) {
  const [messages, setMessages] = useState([]); // {sender,text,audioUrl?}
  const [input, setInput] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [sending, setSending] = useState(false);
  const [aiTyping, setAiTyping] = useState(false);

  // audio recording
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);

  const chatEndRef = useRef(null);
  const navigate = useNavigate();
  const { logout } = useAuth0();

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, aiTyping]);

  const groups = useMemo(() => {
    const g = { movie: [], book: [], song: [] };
    for (const r of recommendations) g[normalizeCategory(r.category)].push(r.name);
    return g;
  }, [recommendations]);

  // ---------- AUDIO: record ----------
  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const rec = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];
      rec.ondataavailable = (e) => e.data && e.data.size && audioChunksRef.current.push(e.data);
      rec.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeToInput(blob);
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };
      mediaRecorderRef.current = rec;
      rec.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Mic error:', err);
      alert('Microphone permission needed (use localhost or HTTPS).');
    }
  };
  const stopRec = () => { try { mediaRecorderRef.current?.stop(); } finally { setIsRecording(false); } };
  const toggleRec = () => (isRecording ? stopRec() : startRec());

  const transcribeToInput = async (blob) => {
    try {
      const fd = new FormData();
      fd.append('file', blob, 'speech.webm');
      const res = await axios.post(`${BACKEND}/audio/transcribe`, fd, { headers: { 'Content-Type':'multipart/form-data' }});
      const text = res?.data?.text?.trim();
      if (text) setInput((prev) => (prev ? `${prev} ${text}` : text));
      else alert("Didn't catch that—try again a bit closer to the mic.");
    } catch (e) {
      console.error('Transcription failed:', e?.message || e);
      alert('Transcription failed.');
    }
  };

  // ---------- AUDIO: TTS ----------
  const tts = async (text) => {
    try {
      const res = await fetch(`${BACKEND}/audio/tts`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ text, voice: 'alloy', format: 'mp3' }),
      });
      if (!res.ok) throw new Error('TTS failed');
      const blob = await res.blob();
      return URL.createObjectURL(blob);
    } catch (e) {
      console.warn('TTS unavailable:', e?.message || e);
      return null;
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || sending) return;

    const text = input.trim();
    setMessages((prev) => [...prev, { sender: 'user', text }]);
    setInput('');
    setSending(true);
    setAiTyping(true);

    try {
      // 1) Chat
      const chatRes = await axios.post(`${BACKEND}/chat`, { message: text });
      const aiText = chatRes?.data?.response ?? "I'm here and listening.";
      const audioUrl = await tts(aiText);
      setMessages((prev) => [...prev, { sender: 'ai', text: aiText, audioUrl }]);

      // 2) Emotion Detection
      let detected = [];
      try {
        const emotionRes = await axios.post(`${BACKEND}/predict`, { text });
        detected = emotionRes?.data?.detected_problems || [];
      } catch (e) {
        console.error('Emotion detection failed:', e?.message || e);
      }

      // 3) Crisis Detection
      let crisisLevel = 'NORMAL';
      try {
        const crisisRes = await axios.post(`${BACKEND}/crisis`, { message: text });
        crisisLevel = crisisRes?.data?.label || 'NORMAL';
      } catch (e) {
        console.error('Crisis detection failed:', e?.message || e);
      }

      // 4) Recommendations (always render all three)
      try {
        const recRes = await axios.post(`${BACKEND}/recommendations`, { emotions: detected });
        setRecommendations(flattenRecs(recRes?.data));
      } catch (e) {
        console.error('Recommendation fetching failed:', e?.message || e);
        setRecommendations([]);
      }

      // 5) Logging
      try {
        await axios.post(`${BACKEND}/log`, {
          name: user?.name || 'Anonymous',
          email: user?.email || 'unknown@user',
          message: text,
          emotions: detected,
          crisis: crisisLevel,
        });
      } catch (e) {
        console.warn('Log failed (non-blocking):', e?.message || e);
      }
    } catch (e) {
      console.error('Main chat error:', e?.message || e);
      setMessages((prev) => [
        ...prev,
        { sender: 'ai', text: '🤖 I’m here for you… just having a technical hiccup. Please try again.' },
      ]);
    } finally {
      setSending(false);
      setAiTyping(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('role');
    logout({ returnTo: window.location.origin });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div className="serenai-container">
      {/* SIDEBAR */}
      <div className="sidebar">
        <div className="logo-section">
          <img src={Logo} alt="SerenAI Logo" className="logo" />
        </div>
        <div className="rec-title">FEEL BETTER 💭</div>

        <div className="rec-section">
          <div className="rec-subtitle">Movies ({groups.movie.length})</div>
          <div className="rec-list">
            {groups.movie.length ? groups.movie.map((n,i)=>(
              <div className="rec-item" key={`m-${i}`}>{catIcon('movie')} {n}</div>
            )) : <div className="rec-empty">No movie picks yet.</div>}
          </div>
        </div>

        <div className="rec-section">
          <div className="rec-subtitle">Books ({groups.book.length})</div>
          <div className="rec-list">
            {groups.book.length ? groups.book.map((n,i)=>(
              <div className="rec-item" key={`b-${i}`}>{catIcon('book')} {n}</div>
            )) : <div className="rec-empty">No book picks yet.</div>}
          </div>
        </div>

        <div className="rec-section">
          <div className="rec-subtitle">Songs ({groups.song.length})</div>
          <div className="rec-list">
            {groups.song.length ? groups.song.map((n,i)=>(
              <div className="rec-item" key={`s-${i}`}>{catIcon('song')} {n}</div>
            )) : <div className="rec-empty">No song picks yet.</div>}
          </div>
        </div>
      </div>

      {/* CHAT */}
      <div className="chat-container">
        <div className="chat-header">
          <div className="left">
            <img src={Icon} alt="icon" className="chat-icon" />
            <div>
              <div className="chat-title">SerenAI</div>
              <div className="online-status">{sending || aiTyping ? 'Typing…' : 'Online'}</div>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>

        <div className="chat-body">
          <div className="chat-box">
            {messages.map((m,i)=>(
              <div key={i} className={`chat-bubble ${m.sender}`}>
                <div>{m.text}</div>
                {m.sender === 'ai' && m.audioUrl && (
                  <audio className="tts-audio" src={m.audioUrl} controls preload="none" />
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <div className="chat-input-row">
            <button
              className={`mic-btn ${isRecording ? 'recording' : ''}`}
              onClick={toggleRec}
              title={isRecording ? 'Stop recording' : 'Start recording'}
            >
              {isRecording ? '⏺️ Recording…' : '🎙️ Speak'}
            </button>

            <textarea
              value={input}
              onChange={(e)=>setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Write or dictate your message… (Shift+Enter new line)"
              rows={1}
              className="chat-input"
              disabled={sending}
            />

            <button className="send-btn" onClick={sendMessage} disabled={sending}>
              {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
