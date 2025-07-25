import React from "react";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Box from "@mui/material/Box";
import Avatar from "@mui/material/Avatar";
import { styled } from "@mui/material/styles";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PersonIcon from "@mui/icons-material/Person";

interface HeaderProps {
  title?: string;
  screen: "dashboard" | "accounts" | "transactions" | "analytics" | "profile";
  setScreen: (
    screen: "dashboard" | "accounts" | "transactions" | "analytics" | "profile"
  ) => void;
  user?: {
    name?: string;
    photo?: string;
    username?: string;
    email?: string;
    provider?: string;
  } | null;
}

const Header: React.FC<HeaderProps> = ({
  title = "FinTrack",
  screen,
  setScreen,
  user,
}) => {
  // Styled components
  const StyledAppBar = styled(AppBar)({
    zIndex: 1201,
  });

  const StyledToolbar = styled(Toolbar)(({ theme }) => ({
    minHeight: 64,
    paddingLeft: 16,
    paddingRight: 16,
    [theme.breakpoints.down("sm")]: {
      minHeight: 56,
    },
  }));

  const StyledTitle = styled(Typography)(({ theme }) => ({
    flexGrow: 1,
    textAlign: "left",
    fontSize: "1.5rem",
    [theme.breakpoints.down("sm")]: {
      textAlign: "center",
      fontSize: "1.25rem",
    },
  }));

  const SafeArea = styled("div")({
    height: "env(safe-area-inset-top, 0px)",
  });

  return (
    <StyledAppBar position="fixed" color="primary">
      <SafeArea />
      <StyledToolbar
        sx={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          {(screen === "profile" || screen === "accounts") && (
            <IconButton
              edge="start"
              color="inherit"
              aria-label="back"
              sx={{ mr: 2 }}
              onClick={() => setScreen("dashboard")}
            >
              <ArrowBackIcon />
            </IconButton>
          )}
        </Box>
        <StyledTitle variant="h5" sx={{ flexGrow: 1, textAlign: "center" }}>
          {title}
        </StyledTitle>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          {screen === "dashboard" && (
            <>
              {user && (
                <Box sx={{ ml: 2 }}>
                  <IconButton
                    onClick={() => setScreen("profile")}
                    sx={{ p: 0 }}
                  >
                    <Avatar
                      src={user.photo || undefined}
                      alt={user.name || "User"}
                      sx={{
                        width: 36,
                        height: 36,
                        border: "2px solid #fff",
                      }}
                    >
                      {!user.photo && <PersonIcon />}
                    </Avatar>
                  </IconButton>
                </Box>
              )}
            </>
          )}
        </Box>
      </StyledToolbar>
    </StyledAppBar>
  );
};

export default Header;
