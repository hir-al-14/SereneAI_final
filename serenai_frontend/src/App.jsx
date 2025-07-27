import React, { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import LandingPage from './components/LandingPage';
import UserDashboard from './components/UserDashboard';
import TherapistDashboard from './components/TherapistDashboard';

function App() {
  const { isAuthenticated, user, loginWithRedirect, logout, isLoading } = useAuth0();
  const [role, setRole] = React.useState(null);

  useEffect(() => {
    const storedRole = localStorage.getItem('role');
    if (storedRole) setRole(storedRole);
  }, []);

  if (isLoading) return <div>Loading...</div>;

  if (!isAuthenticated) {
    return <LandingPage onRoleSelect={(r) => {
      localStorage.setItem('role', r);
      setRole(r);
      loginWithRedirect();
    }} />;
  }

  if (role === "therapist") return <TherapistDashboard user={user} logout={() => logout({ returnTo: window.location.origin })} />;
  return <UserDashboard user={user} logout={() => logout({ returnTo: window.location.origin })} />;
}

export default App;
