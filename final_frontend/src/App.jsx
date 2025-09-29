// src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Auth0Provider, useAuth0 } from "@auth0/auth0-react";
import LandingPage from "./components/LandingPage";
import UserDashboard from "./pages/UserDashboard";
import TherapistDashboard from "./pages/TherapistDashboard";
import AuthWrapper from "./components/AuthWrapper";

const domain = "dev-serenai-140521.us.auth0.com";
const clientId = "3poHf1sFl33G1LjiJxyFYdXc675IOhK0";

export default function App() {
  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
      }}
    >
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/user" element={<AuthWrapper role="user" />} />
          <Route path="/therapist" element={<AuthWrapper role="therapist" />} />
        </Routes>
      </BrowserRouter>
    </Auth0Provider>
  );
}
