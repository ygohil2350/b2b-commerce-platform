import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Inventory2Rounded } from "@mui/icons-material";
import { useDispatch, useSelector } from "react-redux";
import { api } from "../api";
import {
  loginFail,
  loginStart,
  loginSuccess,
  type AppDispatch,
  type RootState,
} from "../store";
export function Login() {
  const [email, setEmail] = useState("buyer@example.com");
  const [password, setPassword] = useState("Buyer123!");
  const dispatch = useDispatch<AppDispatch>();
  const { loading, error } = useSelector((s: RootState) => s.auth);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(loginStart());
    try {
      const body = new URLSearchParams({ username: email, password });
      dispatch(
        loginSuccess(
          (
            await api.post("/auth/login", body, {
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
            })
          ).data,
        ),
      );
    } catch {
      dispatch(loginFail("Email or password is incorrect."));
    }
  };
  const demo = (role: "buyer" | "supplier") => {
    setEmail(`${role}@example.com`);
    setPassword(role === "buyer" ? "Buyer123!" : "Supplier123!");
  };
  return (
    <Box className="login-shell">
      <Box className="login-copy">
        <Box className="brand-mark large">
          <Inventory2Rounded />
        </Box>
        <Typography
          variant="h1"
          sx={{ fontSize: { xs: 44, md: 64 }, maxWidth: 620 }}
        >
          Inventory clarity.
          <br />
          Orders without friction.
        </Typography>
        <Typography
          variant="h6"
          sx={{
            color: "rgba(255,255,255,.68)",
            fontWeight: 400,
            maxWidth: 540,
            mt: 2,
          }}
        >
          One operational workspace for B2B suppliers and purchasing teams.
        </Typography>
        <Box className="signal">
          <span></span>Live inventory controls
        </Box>
      </Box>
      <Card sx={{ width: "100%", maxWidth: 440, border: 0 }}>
        <CardContent sx={{ p: { xs: 3, sm: 5 } }}>
          <Typography variant="h4">Welcome back</Typography>
          <Typography color="text.secondary" sx={{ mt: 1, mb: 4 }}>
            Access your operations workspace.
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Box component="form" onSubmit={submit}>
            <Stack spacing={2.5}>
              <TextField
                label="Work email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
              />
              <TextField
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                required
              />
              <Button
                size="large"
                variant="contained"
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  "Sign in"
                )}
              </Button>
            </Stack>
          </Box>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 4, mb: 1.5 }}
          >
            Try a demo workspace
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={() => demo("buyer")}>
              Buyer demo
            </Button>
            <Button variant="outlined" onClick={() => demo("supplier")}>
              Supplier demo
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
