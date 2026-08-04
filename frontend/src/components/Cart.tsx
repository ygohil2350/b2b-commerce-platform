import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  DeleteOutlineRounded,
  ShoppingCartCheckoutRounded,
} from "@mui/icons-material";
import { useDispatch, useSelector } from "react-redux";
import { api } from "../api";
import {
  clearCart,
  removeFromCart,
  setQuantity,
  type AppDispatch,
  type RootState,
} from "../store";
export function Cart({ onComplete }: { onComplete: () => void }) {
  const lines = useSelector((s: RootState) => s.cart.lines);
  const dispatch = useDispatch<AppDispatch>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const total = lines.reduce(
    (sum, x) => sum + Number(x.product.price) * x.quantity,
    0,
  );
  const checkout = async () => {
    setBusy(true);
    setError("");
    try {
      await api.post("/orders", {
        items: lines.map((x) => ({
          product_id: x.product.id,
          quantity: x.quantity,
        })),
      });
      dispatch(clearCart());
      onComplete();
    } catch (e: any) {
      const d = e.response?.data?.detail;
      setError(
        typeof d === "string"
          ? d
          : (d?.message ?? "Order could not be placed."),
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Typography variant="h4">Purchase order</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Review quantities before confirming inventory allocation.
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "2fr 1fr" },
          gap: 3,
        }}
      >
        <Stack spacing={1.5}>
          {lines.length === 0 ? (
            <Card>
              <CardContent sx={{ py: 8, textAlign: "center" }}>
                <Typography variant="h6">Your order is empty</Typography>
                <Typography color="text.secondary">
                  Add products from the catalog to begin.
                </Typography>
              </CardContent>
            </Card>
          ) : (
            lines.map((x) => (
              <Card key={x.product.id}>
                <CardContent
                  sx={{ display: "flex", alignItems: "center", gap: 2 }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Typography fontWeight={700}>{x.product.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {x.product.sku} · ${Number(x.product.price).toFixed(2)} /
                      unit
                    </Typography>
                  </Box>
                  <TextField
                    size="small"
                    type="number"
                    value={x.quantity}
                    onChange={(e) =>
                      dispatch(
                        setQuantity({
                          id: x.product.id,
                          quantity: Number(e.target.value),
                        }),
                      )
                    }
                    slotProps={{
                      htmlInput: { min: 1, max: x.product.stock_quantity },
                    }}
                    sx={{ width: 90 }}
                  />
                  <Typography
                    fontWeight={750}
                    sx={{ width: 100, textAlign: "right" }}
                  >
                    ${(Number(x.product.price) * x.quantity).toFixed(2)}
                  </Typography>
                  <IconButton
                    onClick={() => dispatch(removeFromCart(x.product.id))}
                  >
                    <DeleteOutlineRounded />
                  </IconButton>
                </CardContent>
              </Card>
            ))
          )}
        </Stack>
        <Card sx={{ height: "fit-content" }}>
          <CardContent>
            <Typography variant="h6">Order summary</Typography>
            <Stack
              direction="row"
              justifyContent="space-between"
              sx={{ mt: 3 }}
            >
              <Typography color="text.secondary">Line items</Typography>
              <Typography>{lines.length}</Typography>
            </Stack>
            <Divider sx={{ my: 2 }} />
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="h6">Total</Typography>
              <Typography variant="h5" fontWeight={800}>
                ${total.toFixed(2)}
              </Typography>
            </Stack>
            <Button
              fullWidth
              size="large"
              variant="contained"
              startIcon={<ShoppingCartCheckoutRounded />}
              disabled={!lines.length || busy}
              onClick={checkout}
              sx={{ mt: 3 }}
            >
              Confirm order
            </Button>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              sx={{ mt: 1.5, textAlign: "center" }}
            >
              Stock is reserved atomically on confirmation.
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </>
  );
}
