import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: {
					DEFAULT: 'hsl(var(--border))',
					light: 'var(--border-light)',
					default: 'var(--border-default)',
					medium: 'var(--border-medium)',
					dark: 'var(--border-dark)'
				},
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: {
					DEFAULT: 'hsl(var(--background))',
					primary: 'var(--background-primary)',
					secondary: 'var(--background-secondary)',
					tertiary: 'var(--background-tertiary)',
					light: 'var(--background-light)',
					card: 'var(--background-card)'
				},
				foreground: 'hsl(var(--foreground))',
				text: {
					primary: 'var(--text-primary)',
					secondary: 'var(--text-secondary)',
					light: 'var(--text-light)',
					lighter: 'var(--text-lighter)',
					white: 'var(--text-white)'
				},
				brand: {
					primary: 'var(--brand-primary)',
					secondary: 'var(--brand-secondary)'
				},
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				status: {
					backlog: 'hsl(var(--status-backlog))',
					todo: 'hsl(var(--status-todo))',
					progress: 'hsl(var(--status-progress))',
					review: 'hsl(var(--status-review))',
					done: 'hsl(var(--status-done))'
				},
				button: {
					primary: {
						background: 'var(--brand-primary)',
						text: 'var(--text-white)',
						hover: 'color-mix(in srgb, var(--brand-primary) 90%, black)'
					},
					outline: {
						background: 'var(--button-outline-background)',
						text: 'var(--button-outline-text)',
						border: 'var(--button-outline-border)',
						hover: 'var(--button-outline-hover)'
					},
					secondary: {
						background: 'var(--brand-primary)',
						text: 'var(--text-white)',
						hover: 'color-mix(in srgb, var(--brand-primary) 90%, black)'
					}
				},
				sidebar: {
					DEFAULT: 'var(--sidebar-background)',
					foreground: 'var(--sidebar-foreground)',
					primary: 'var(--sidebar-primary)',
					'primary-foreground': 'var(--sidebar-primary-foreground)',
					accent: 'var(--sidebar-accent)',
					'accent-foreground': 'var(--sidebar-accent-foreground)',
					border: 'var(--sidebar-border)',
					ring: 'var(--sidebar-ring)'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
