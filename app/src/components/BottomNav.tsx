import React from "react";
import { useTranslation } from "react-i18next";
import { BottomNavigation, BottomNavigationAction, Paper, styled } from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import ReceiptIcon from "@mui/icons-material/Receipt";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import PersonIcon from "@mui/icons-material/Person";

interface BottomNavProps {
  screen: "dashboard" | "accounts" | "transactions" | "analytics" | "profile";
  setScreen: (
    screen: "dashboard" | "accounts" | "transactions" | "analytics" | "profile"
  ) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ screen, setScreen }) => {
  const { t } = useTranslation();

  const SafeArea = styled("div")({
    height: "env(safe-area-inset-bottom, 0px)",
  });

  const getScreenIndex = (currentScreen: string) => {
    switch (currentScreen) {
      case "dashboard":
        return 0;
      case "accounts":
        return 1;
      case "transactions":
        return 2;
      case "analytics":
        return 3;
      case "profile":
        return 4;
      default:
        return 0;
    }
  };

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    switch (newValue) {
      case 0:
        setScreen("dashboard");
        break;
      case 1:
        setScreen("accounts");
        break;
      case 2:
        setScreen("transactions");
        break;
      case 3:
        setScreen("analytics");
        break;
      case 4:
        setScreen("profile");
        break;
    }
  };

  return (
    <Paper
      sx={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
      }}
      elevation={3}
    >
      <BottomNavigation
        value={getScreenIndex(screen)}
        onChange={handleChange}
        showLabels
      >
        <BottomNavigationAction
          label={t("dashboard", "Dashboard")}
          icon={<DashboardIcon />}
        />
        <BottomNavigationAction
          label={t("accounts", "Accounts")}
          icon={<AccountBalanceIcon />}
        />
        <BottomNavigationAction
          label={t("transactions", "Transactions")}
          icon={<ReceiptIcon />}
        />
        <BottomNavigationAction
          label={t("analytics", "Analytics")}
          icon={<AnalyticsIcon />}
        />
        <BottomNavigationAction
          label={t("profile", "Profile")}
          icon={<PersonIcon />}
        />
      </BottomNavigation>
      <SafeArea />
    </Paper>
  );
};

export default BottomNav;
