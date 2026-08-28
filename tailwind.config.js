/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html"],
  darkMode: "media",
  theme: {
    extend: {
      colors: {
        canvas: "rgb(var(--rgb-bg-canvas) / <alpha-value>)",
        surface: "rgb(var(--rgb-bg-surface) / <alpha-value>)",
        action: "rgb(var(--rgb-action-primary) / <alpha-value>)",
        "action-hover": "rgb(var(--rgb-action-primary-hover) / <alpha-value>)",
        "action-label": "rgb(var(--rgb-action-primary-label) / <alpha-value>)",
        "secondary-action": "var(--color-action-secondary)",
        "secondary-action-hover": "rgb(var(--rgb-action-secondary-hover) / <alpha-value>)",
        foreground: "rgb(var(--rgb-text-primary) / <alpha-value>)",
        muted: "rgb(var(--rgb-text-muted) / <alpha-value>)",
        inverse: "rgb(var(--rgb-text-inverse) / <alpha-value>)",
        icon: "rgb(var(--rgb-icon-primary) / <alpha-value>)",
        line: "rgb(var(--rgb-border-subtle) / <alpha-value>)",
        accent: "rgb(var(--rgb-accent-primary) / <alpha-value>)",
        highlight: "rgb(var(--rgb-accent-highlight) / <alpha-value>)",
        "gradient-stop": "rgb(var(--rgb-accent-gradient) / <alpha-value>)",
        "typing-dot": "rgb(var(--rgb-chat-dot) / <alpha-value>)",
        rating: "rgb(var(--rgb-rating-star) / <alpha-value>)"
      },
      screens: {
        "3xl": "1920px"
      }
    }
  },
  plugins: []
};
