import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Auth0Provider, useAuth0 } from "@auth0/auth0-react";
import LandingPage from "./pages/LandingPage";
import PatientView from "./pages/PatientView";
import TherapistView from "./pages/TherapistView";
import Header from "./components/Header";
import "./App.css";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth0();
  if (isLoading) return <div>Loading...</div>;
  return isAuthenticated ? children : <Navigate to="/" />;
};

function App() {
  return (
    <Auth0Provider
      domain="dev-serenai-140521.us.auth0.com"
      clientId="3poHf1sFl33G1LjiJxyFYdXc675IOhK0"
      authorizationParams={{ redirect_uri: window.location.origin }}
    >
      <Router>
        <Header />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/patient" element={<ProtectedRoute><PatientView /></ProtectedRoute>} />
          <Route path="/therapist" element={<ProtectedRoute><TherapistView /></ProtectedRoute>} />
        </Routes>
      </Router>
    </Auth0Provider>
  );
}

export default App;
