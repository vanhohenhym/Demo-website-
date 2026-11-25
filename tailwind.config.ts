import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: "#081621",
          navydark: "#050d14",
          blue: "#3749bb",
          blueDark: "#244b7d",
          blueDeep: "#00237e",
          sky: "#0ea5e9",
          orange: "#ef4a23",
          orangeHover: "#d93c16",
          amber: "#f59e0b",
          amberWarm: "#fb923c",
          expoDeep: "#0c1258",
          expoMid: "#181f7a",
          promoBlueFrom: "#0044b3",
          promoBlueTo: "#002060",
          promoRedFrom: "#f05118",
          promoRedTo: "#c81e1e",
          storeCyan: "#00b4db",
          storeBlue: "#0d52bd",
          storeNavy: "#002077",
          storeGold: "#f5a623",
          storeGoldHover: "#e09316",
          badgePurple: "#6e2594",
          flashBg: "#eef0ff",
          flashBgEnd: "#e6eaff",
          flashPosterBlueFrom: "#061b44",
          flashPosterBlueTo: "#0b3582",
          flashPosterOrangeFrom: "#c62808",
          flashPosterOrangeTo: "#f26419",
          countdownRed: "#c8232c",
          megaRibbonFrom: "#8c2b06",
          megaRibbonMid: "#d95b12",
          grayBg: "#f2f4f8",
          card: "#ffffff",
          border: "#e5e7eb",
          textMain: "#111827",
          textMuted: "#6b7280",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-sans)",
          '"Segoe UI"',
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
      },
      maxWidth: {
        site: "1320px",
      },
      borderRadius: {
        card: "6px",
        control: "4px",
      },
      boxShadow: {
        card: "0 1px 4px rgba(8, 22, 33, 0.06)",
        cardHover: "0 6px 18px rgba(8, 22, 33, 0.1)",
        nav: "0 2px 6px rgba(8, 22, 33, 0.06)",
        dock: "0 6px 20px rgba(8, 22, 33, 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
