/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			colors: {
				st: {
					bg: '#0e1218',
					panel: '#141a22',
					'panel-border': '#232b36',
					'line-idle': '#2b3542',
					'line-active': '#57e0d1',
					'text-main': '#dfe6ee',
					'text-dim': '#7c8a9a',
					amber: '#f0a63d',
					coral: '#ef6f6f',
					violet: '#a586e8',
					teal: '#4fc9c9',
					lime: '#92c65e',
				},
			},
			fontFamily: {
				jetbrains: ["'JetBrains Mono'", 'monospace'],
				inter: ["'Inter'", 'sans-serif'],
			},
		},
	},
	plugins: [require("@tailwindcss/typography"),require("daisyui")],
	daisyui: {
		themes: true, // true: all themes | false: only light + dark | array: specific themes like this ["light", "dark", "cupcake"]
		darkTheme: "dark", // name of one of the included themes for dark mode
		logs: false, // Shows info about daisyUI version and used config in the console when building your CSS
	  }
}
