import React from "react";
import { useTranslation } from "react-i18next";
import {
  Switch,
  Typography,
  Paper,
  Box,
  Divider,
  Select,
  MenuItem,
} from "@mui/material";
import { styled } from "@mui/material/styles";

// Props for ConfigScreen
export interface ConfigScreenProps {
  themeMode: "light" | "dark";
  setThemeMode: (mode: "light" | "dark") => void;
  language: string;
  setLanguage: (lang: string) => void;
}

const Pane = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
  borderRadius: Number(theme.shape.borderRadius) * 2,
  boxShadow: theme.shadows[2],
}));

const ConfigScreen: React.FC<ConfigScreenProps> = ({
  themeMode,
  setThemeMode,
  language,
  setLanguage,
}) => {
  const { t } = useTranslation();
  return (
    <Box sx={{ padding: 3, maxWidth: 600, margin: "0 auto" }}>
      <Typography variant="h4" gutterBottom>
        {t("config")}
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        {t("welcome")}
      </Typography>
      <Divider sx={{ my: 2 }} />
      <Pane>
        <Typography variant="h6" gutterBottom>
          {t("theme")}
        </Typography>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Typography>
            {t("theme")}: {themeMode === "dark" ? t("dark") : t("light")}
          </Typography>
          <Switch
            checked={themeMode === "dark"}
            onChange={() =>
              setThemeMode(themeMode === "dark" ? "light" : "dark")
            }
            color="primary"
            slotProps={{ input: { "aria-label": "toggle dark mode" } }}
          />
        </Box>
      </Pane>
      <Pane>
        <Typography variant="h6" gutterBottom>
          {t("language")}
        </Typography>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Typography>{t("language")}</Typography>
          <Select
            value={language}
            onChange={(e) => setLanguage(e.target.value as string)}
            size="small"
            sx={{ minWidth: 120 }}
          >
            <MenuItem value="en">{t("en")}</MenuItem>
            <MenuItem value="pt">{t("pt")}</MenuItem>
            <MenuItem value="es">{t("es")}</MenuItem>
            <MenuItem value="fr">{t("fr")}</MenuItem>
            <MenuItem value="de">{t("de")}</MenuItem>
            {/* Add more languages as needed */}
          </Select>
        </Box>
      </Pane>
      {/* Add more panes for other config sections as needed */}
    </Box>
  );
};

export default ConfigScreen;
