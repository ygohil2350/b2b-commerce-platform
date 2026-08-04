import { createTheme } from "@mui/material/styles";
export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#176b5b", dark: "#0b4b3f", contrastText: "#fff" },
    secondary: { main: "#e3a72f" },
    background: { default: "#f4f6f3", paper: "#fff" },
    text: { primary: "#17211f", secondary: "#66706e" },
  },
  typography: {
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
    h1: { fontWeight: 750, letterSpacing: "-.04em" },
    h4: { fontWeight: 750, letterSpacing: "-.025em" },
    h6: { fontWeight: 700 },
    button: { textTransform: "none", fontWeight: 700 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          border: "1px solid #e3e8e4",
          boxShadow: "0 2px 14px rgba(20,50,40,.04)",
        },
      },
    },
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiChip: { styleOverrides: { root: { fontWeight: 650 } } },
  },
});
