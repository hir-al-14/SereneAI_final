// src/components/AuthWrapper.jsx
import React, { useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import UserDashboard from "../pages/UserDashboard";
import TherapistDashboard from "../pages/TherapistDashboard";

const AuthWrapper = ({ role }) => {
  const { loginWithRedirect, isAuthenticated, isLoading, user } = useAuth0();

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      loginWithRedirect();
    }
  }, [isAuthenticated, isLoading, loginWithRedirect]);

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return null;

  return role === "therapist" ? (
    <TherapistDashboard user={user} />
  ) : (
    <UserDashboard user={user} />
  );
};

export default AuthWrapper;
