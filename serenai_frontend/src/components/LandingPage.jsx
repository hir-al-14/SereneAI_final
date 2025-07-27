import React from 'react';
import logo from '../assets/logo.png';
import './LandingPage.css';

const LandingPage = ({ onRoleSelect }) => {
  return (
    <div className="landing-container">
        <div className="landing-box">
            <img src={logo} alt="SerenAI Logo" className="landing-logo" />
            <h1 className="landing-title">Welcome to <strong>SerenAI</strong></h1>
            <h2 className="slogan">Speak Freely. Heal Gently.</h2>
            <p className="landing-subtitle">Select your role to begin:</p>
            <div className="landing-buttons">
            <button className="user-button" onClick={() => onRoleSelect("user")}>
                I’m a User
            </button>
            <button className="therapist-button" onClick={() => onRoleSelect("therapist")}>
                I’m a Therapist
            </button>
            </div>
        </div>
    </div>
  );
};

export default LandingPage;
