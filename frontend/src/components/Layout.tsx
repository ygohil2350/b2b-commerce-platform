import { useState, type ReactNode } from "react";
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Button,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from "@mui/material";
import {
  DashboardRounded,
  Inventory2Rounded,
  LocalShippingRounded,
  LogoutRounded,
  MenuRounded,
  ShoppingCartRounded,
} from "@mui/icons-material";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../store";
import { logout } from "../store";

export type Page = "dashboard" | "products" | "orders" | "cart";
const links: { id: Page; label: string; icon: ReactNode }[] = [
  { id: "dashboard", label: "Overview", icon: <DashboardRounded /> },
  { id: "products", label: "Products", icon: <Inventory2Rounded /> },
  { id: "orders", label: "Orders", icon: <LocalShippingRounded /> },
];
export function Layout({
  page,
  setPage,
  children,
}: {
  page: Page;
  setPage: (p: Page) => void;
  children: ReactNode;
}) {
  const [mobile, setMobile] = useState(false);
  const user = useSelector((s: RootState) => s.auth.user)!;
  const count = useSelector((s: RootState) => s.cart.lines.length);
  const dispatch = useDispatch();
  const nav = (
    <Box sx={{ p: 2 }}>
      <Box
        sx={{ display: "flex", alignItems: "center", gap: 1.2, px: 1, mb: 4 }}
      >
        <Box className="brand-mark">S</Box>
        <Typography variant="h6">StockPilot</Typography>
      </Box>
      <List>
        {links.map((x) => (
          <ListItemButton
            selected={page === x.id}
            onClick={() => {
              setPage(x.id);
              setMobile(false);
            }}
            key={x.id}
            sx={{ borderRadius: 2, mb: 0.5 }}
          >
            <ListItemIcon>{x.icon}</ListItemIcon>
            <ListItemText primary={x.label} />
          </ListItemButton>
        ))}
      </List>
      <Box
        sx={{
          position: "absolute",
          bottom: 20,
          left: 16,
          right: 16,
          p: 1.5,
          bgcolor: "#eef3ef",
          borderRadius: 2,
        }}
      >
        <Typography variant="caption" color="text.secondary">
          SIGNED IN AS
        </Typography>
        <Typography variant="body2" fontWeight={700}>
          {user.full_name}
        </Typography>
        <Typography
          variant="caption"
          color="primary"
          sx={{ textTransform: "capitalize" }}
        >
          {user.role}
        </Typography>
      </Box>
    </Box>
  );
  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", md: "block" },
          width: 240,
          "& .MuiDrawer-paper": {
            width: 240,
            borderRight: "1px solid #dde5df",
          },
        }}
      >
        {nav}
      </Drawer>
      <Drawer
        open={mobile}
        onClose={() => setMobile(false)}
        sx={{ display: { md: "none" }, "& .MuiDrawer-paper": { width: 240 } }}
      >
        {nav}
      </Drawer>
      <Box component="main" sx={{ flex: 1, minWidth: 0 }}>
        <AppBar
          position="sticky"
          color="inherit"
          elevation={0}
          sx={{ borderBottom: "1px solid #e3e8e4" }}
        >
          <Toolbar>
            <IconButton
              onClick={() => setMobile(true)}
              sx={{ display: { md: "none" }, mr: 1 }}
            >
              <MenuRounded />
            </IconButton>
            <Typography
              fontWeight={750}
              sx={{ flex: 1, textTransform: "capitalize" }}
            >
              {page}
            </Typography>
            {user.role === "buyer" && (
              <IconButton onClick={() => setPage("cart")} sx={{ mr: 1 }}>
                <Badge badgeContent={count} color="secondary">
                  <ShoppingCartRounded />
                </Badge>
              </IconButton>
            )}
            <Avatar
              sx={{
                width: 34,
                height: 34,
                bgcolor: "primary.main",
                fontSize: 14,
              }}
            >
              {user.full_name
                .split(" ")
                .map((x) => x[0])
                .join("")
                .slice(0, 2)}
            </Avatar>
            <Button
              color="inherit"
              startIcon={<LogoutRounded />}
              onClick={() => dispatch(logout())}
              sx={{ ml: 1, display: { xs: "none", sm: "flex" } }}
            >
              Sign out
            </Button>
          </Toolbar>
        </AppBar>
        <Box sx={{ p: { xs: 2, sm: 3, lg: 4 }, maxWidth: 1440, mx: "auto" }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
