import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors"; // <--- Importante: Importar colores

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    // --- AGREGA ESTA LÍNEA ---
    "./node_modules/@tremor/**/*.{js,ts,jsx,tsx}", 
  ],
  theme: {
    transparent: "transparent",
    current: "currentColor",
    extend: {
      // --- AGREGA ESTA SECCIÓN DE COLORES ---
      colors: {
        tremor: {
          brand: {
            faint: colors.blue[50],
            muted: colors.blue[200],
            subtle: colors.blue[400],
            DEFAULT: colors.blue[500],
            emphasis: colors.blue[700],
            inverted: colors.white,
          },
          background: {
            muted: colors.gray[50],
            subtle: colors.gray[100],
            DEFAULT: colors.white,
            emphasis: colors.gray[700],
          },
          border: {
            DEFAULT: colors.gray[200],
          },
          ring: {
            DEFAULT: colors.gray[200],
          },
          content: {
            subtle: colors.gray[400],
            DEFAULT: colors.gray[500],
            emphasis: colors.gray[700],
            strong: colors.gray[900],
            inverted: colors.white,
          },
        },
      },
      // ---------------------------------------
    },
  },
  plugins: [],
};
export default config;