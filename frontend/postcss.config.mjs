import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config = {
  plugins: {
    "@tailwindcss/postcss": {
      // Force Tailwind to resolve from the frontend project directory.
      base: __dirname,
    },
  },
};

export default config;
