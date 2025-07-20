import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.example.app",
  appName: "FinTrack",
  webDir: "dist",
  server: {
    allowNavigation: [
      "fintrack-api.the-cube-lab.com",
      "accounts.google.com",
      "*.googleapis.com",
      "localhost",
      "127.0.0.1",
    ],
    androidScheme: "https",
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
