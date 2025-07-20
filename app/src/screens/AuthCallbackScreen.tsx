import React, { useEffect, useState } from "react";
import { Box, Typography, CircularProgress, Paper } from "@mui/material";
import { styled } from "@mui/material/styles";
import { useTranslation } from "react-i18next";

const Pane = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
  borderRadius: Number(theme.shape.borderRadius) * 2,
  boxShadow: theme.shadows[2],
  textAlign: "center",
}));

// const API_BASE_URL = "https://fintrack-api.the-cube-lab.com";

const AuthCallbackScreen: React.FC = () => {
  const { t } = useTranslation();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the current URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const oauthSuccess = urlParams.get("oauth_success");
        const userDataParam = urlParams.get("user_data");
        const error = urlParams.get("error");

        if (error) {
          throw new Error(`OAuth error: ${error}`);
        }

        if (oauthSuccess === "true" && userDataParam) {
          // Parse the user data that was passed from OAuth callback
          const userData = JSON.parse(decodeURIComponent(userDataParam));

          // Store user info in localStorage
          localStorage.setItem("user", JSON.stringify(userData));

          // Trigger storage event for other tabs/components
          window.dispatchEvent(new Event("storage"));

          console.log(
            "OAuth callback: user data received and stored",
            userData
          );
          setStatus("success");

          // Redirect to dashboard after a short delay
          setTimeout(() => {
            window.location.href = "/";
          }, 1500);
        } else {
          throw new Error("No user data received from OAuth callback");
        }
      } catch (err: unknown) {
        console.error("Auth callback error:", err);
        const errorMessage = err instanceof Error ? err.message : "Authentication failed";
        setError(errorMessage);
        setStatus("error");

        // Redirect back to login after error
        setTimeout(() => {
          window.location.href = "/";
        }, 3000);
      }
    };

    handleCallback();
  }, []);

  return (
    <Box sx={{ padding: 3, maxWidth: 400, margin: "0 auto" }}>
      <Typography variant="h4" gutterBottom>
        {status === "loading" &&
          t("auth_processing", "Processing Authentication...")}
        {status === "success" &&
          t("auth_success", "Authentication Successful!")}
        {status === "error" && t("auth_error", "Authentication Failed")}
      </Typography>

      <Pane>
        {status === "loading" && (
          <>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography variant="body1" color="text.secondary">
              {t("auth_wait", "Please wait while we complete your login...")}
            </Typography>
          </>
        )}

        {status === "success" && (
          <Typography variant="body1" color="success.main">
            {t("auth_redirect", "Redirecting to dashboard...")}
          </Typography>
        )}

        {status === "error" && (
          <Typography variant="body1" color="error">
            {error ||
              t(
                "auth_generic_error",
                "Something went wrong. Redirecting to login..."
              )}
          </Typography>
        )}
      </Pane>
    </Box>
  );
};

export default AuthCallbackScreen;
