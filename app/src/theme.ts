import { createTheme } from "@mui/material/styles";
import type { Theme } from "@mui/material/styles";

function getCssVar(name: string): string {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

export const getLightTheme = (): Theme =>
  createTheme({
    palette: {
      mode: "light",
      primary: { main: getCssVar("--color-primary-light") },
      secondary: { main: getCssVar("--color-secondary-light") },
      background: {
        default: getCssVar("--color-bg-light"),
        paper: getCssVar("--color-bg-light-paper"),
      },
      text: {
        primary: getCssVar("--color-text-light"),
      },
      header: {
        main: getCssVar("--color-header-bg-light"),
      },
      datePicker: {
        future: getCssVar("--color-date-future-light"),
        futureText: getCssVar("--color-date-future-text-light"),
        filled: getCssVar("--color-date-filled-light"),
        filledText: getCssVar("--color-date-filled-text-light"),
        weekend: getCssVar("--color-date-weekend-light"),
        weekendText: getCssVar("--color-date-weekend-text-light"),
        holiday: getCssVar("--color-date-holiday-light"),
        holidayText: getCssVar("--color-date-holiday-text-light"),
      },
    },
  });

export const getDarkTheme = (): Theme =>
  createTheme({
    palette: {
      mode: "dark",
      primary: { main: getCssVar("--color-primary-dark") },
      secondary: { main: getCssVar("--color-secondary-dark") },
      background: {
        default: getCssVar("--color-bg-dark"),
        paper: getCssVar("--color-bg-dark-paper"),
      },
      text: {
        primary: getCssVar("--color-text-dark"),
      },
      header: {
        main: getCssVar("--color-header-bg-dark"),
      },
      datePicker: {
        future: getCssVar("--color-date-future-dark"),
        futureText: getCssVar("--color-date-future-text-dark"),
        filled: getCssVar("--color-date-filled-dark"),
        filledText: getCssVar("--color-date-filled-text-dark"),
        weekend: getCssVar("--color-date-weekend-dark"),
        weekendText: getCssVar("--color-date-weekend-text-dark"),
        holiday: getCssVar("--color-date-holiday-dark"),
        holidayText: getCssVar("--color-date-holiday-text-dark"),
      },
    },
  });
