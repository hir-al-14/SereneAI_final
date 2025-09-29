// src/components/LandingPage.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import bear from "../assets/bear.json";
import { Player } from "@lottiefiles/react-lottie-player";
import "../App.css";

function LandingPage() {
  const [showRoles, setShowRoles] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="landing">
      <div className="left">
        <h1 className="title">SerenAI</h1>
        <p className="subtitle">Because every mind deserves a moment of peace.</p>
        {!showRoles ? (
          <button className="start-button" onClick={() => setShowRoles(true)}>
            Get Started
          </button>
        ) : (
          <>
            <button className="role-button" onClick={() => navigate("/user")}>
              I’m a User
            </button>
            <button className="role-button" onClick={() => navigate("/therapist")}>
              I’m a Therapist
            </button>
          </>
        )}
      </div>
      <div className="right">
        <Player autoplay loop src={bear} style={{ height: "300px", width: "300px" }} />
      </div>
    </div>
  );
}

export default LandingPage;
