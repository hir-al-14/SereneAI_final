import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import "./LandingPage.css";

function LandingPage() {
  const { loginWithRedirect, isAuthenticated } = useAuth0();
  const navigate = useNavigate();

  const handleRoleSelect = (role) => {
    if (isAuthenticated) {
      navigate(`/${role}`);
    } else {
      loginWithRedirect();
    }
  };

  return (
    <div className="landing">
      <h2>Welcome to SerenAI</h2>
      <p>Your mental wellness companion</p>
      <div className="roles">
        <button onClick={() => handleRoleSelect("patient")}>Continue as Patient</button>
        <button onClick={() => handleRoleSelect("therapist")}>Continue as Therapist</button>
      </div>
    </div>
  );
}

export default LandingPage;
