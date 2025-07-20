import React, { useState } from "react";
import {
  Box,
  Button,
  Typography,
  Paper,
  CircularProgress,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { useTranslation } from "react-i18next";


import { handleOAuthLogin, isNativeMobile } from "../utils/authUtils";

const Pane = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
  borderRadius: Number(theme.shape.borderRadius) * 2,
  boxShadow: theme.shadows[2],
  textAlign: "center",
}));

const LoginScreen: React.FC = () => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await handleOAuthLogin();

      if (result.success && result.user) {
        // Store user info in localStorage
        localStorage.setItem("user", JSON.stringify(result.user));

        // Trigger storage event for other components
        window.dispatchEvent(new Event("storage"));

        // For mobile, we don't need to redirect as the app will handle it
        if (!isNativeMobile()) {
          // Web will redirect during OAuth, so this won't be reached
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
      } else {
        setError(result.error || "Authentication failed");
        setIsLoading(false);
      }
    } catch (err: any) {
      setError(err.message || "Failed to initiate login. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ padding: 3, maxWidth: 400, margin: "0 auto" }}>
      <Typography variant="h4" gutterBottom>
        {t("login_title", "Sign in to FinTrack")}
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        {t("login_subtitle", "Access your dashboard securely with Google.")}
      </Typography>
      {error && (
        <Typography color="error" variant="body2" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}
      <Pane>
        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={handleLogin}
          disabled={isLoading}
          sx={{ minWidth: 200 }}
        >
          {isLoading ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            t("login_with_google", "Sign in with Google")
          )}
        </Button>
      </Pane>
    </Box>
  );
};

export default LoginScreen;
