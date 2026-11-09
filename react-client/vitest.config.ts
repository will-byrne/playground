import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vitest/config";

// Unit tests, set up the same way in every web client.
export default defineConfig({
	plugins: [react()],
	test: {
		environment: "jsdom",
		include: ["src/**/*.test.{ts,tsx}"],
		setupFiles: ["./vitest.setup.ts"],
	},
});
