export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        wa: {
          50: "#f0fdf4",
          100: "#dcfce7",
          500: "#25D366",
          600: "#16a34a",
          700: "#128C7E",
          800: "#075E54",
          900: "#064e3b"
        }
      },
      boxShadow: {
        soft: "0 12px 40px rgba(15,23,42,.08)",
        card: "0 8px 30px rgba(7,94,84,.08)"
      }
    }
  },
  plugins: []
};
