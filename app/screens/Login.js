import React from "react";

const GOOGLE_LOGIN_URL = "/login/google"; // Backend OAuth endpoint

function Login() {
  const handleLogin = () => {
    window.location.href = GOOGLE_LOGIN_URL;
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
      }}
    >
      <h2>Sign in to FinTrack</h2>
      <button
        onClick={handleLogin}
        style={{
          background: "#4285F4",
          color: "white",
          border: "none",
          borderRadius: 4,
          padding: "12px 24px",
          fontSize: 18,
          cursor: "pointer",
          marginTop: 24,
        }}
      >
        Sign in with Google
      </button>
    </div>
  );
}

export default Login;
