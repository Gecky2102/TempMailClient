import type { Config } from "tailwindcss";
const cfg: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"] }
    }
  },
  plugins: []
};
export default cfg;
