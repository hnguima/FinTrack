// Theme type extensions for Material-UI

declare module '@mui/material/styles' {
  interface Palette {
    header: {
      main: string;
    };
    datePicker: {
      future: string;
      futureText: string;
      filled: string;
      filledText: string;
      weekend: string;
      weekendText: string;
      holiday: string;
      holidayText: string;
    };
  }

  interface PaletteOptions {
    header?: {
      main: string;
    };
    datePicker?: {
      future: string;
      futureText: string;
      filled: string;
      filledText: string;
      weekend: string;
      weekendText: string;
      holiday: string;
      holidayText: string;
    };
  }
}