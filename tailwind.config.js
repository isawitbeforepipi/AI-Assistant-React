export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      animation: {
        "pulse-bg": "pulseBG 2s infinite",
        talk: "talkAnim 0.6s infinite alternate",
      },
      keyframes: {
        pulseBG: {
          "0%, 100%": { boxShadow: "0 0 0px #facc15" },
          "50%": { boxShadow: "0 0 25px #facc15" },
        },
        talkAnim: {
          "0%": { transform: "scaleY(1)" },
          "100%": { transform: "scaleY(0.7)" },
        },
      },
    },
  },
  plugins: [],
};
