import React from "react";
import { useAuth0 } from "@auth0/auth0-react";
import "./Header.css";

function Header() {
  const { loginWithRedirect, logout, isAuthenticated } = useAuth0();

  return (
    <header className="header">
      <h1 className="logo">Seren<span className="gradient-text">AI</span></h1>
      <nav>
        {isAuthenticated ? (
          <button onClick={() => logout({ returnTo: window.location.origin })}>Logout</button>
        ) : (
          <button onClick={loginWithRedirect}>Login</button>
        )}
      </nav>
    </header>
  );
}

export default Header;
