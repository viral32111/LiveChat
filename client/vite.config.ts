/// <reference types="vitest" />

import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vitejs.dev/config/
export default defineConfig( {
	plugins: [
		react()
	],
	build: {
		outDir: "dist"
	},
	test: {
		globals: true,
		include: [
			"source/tests/*.ts",
			"source/tests/*.tsx"
		]
	}
} )
