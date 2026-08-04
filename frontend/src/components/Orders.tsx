import { useEffect } from "react";
import {
  Box,
  Card,
  Chip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { fetchOrders, type AppDispatch, type RootState } from "../store";
export function Orders() {
  const dispatch = useDispatch<AppDispatch>();
  const { items, loading } = useSelector((s: RootState) => s.orders);
  useEffect(() => {
    dispatch(fetchOrders());
  }, [dispatch]);
  return (
    <>
      <Typography variant="h4">Orders</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Confirmed bulk orders and generated invoices.
      </Typography>
      <TableContainer component={Card}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Order</TableCell>
              <TableCell>Placed</TableCell>
              <TableCell>Items</TableCell>
              <TableCell>Invoice</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Total</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                  No orders yet.
                </TableCell>
              </TableRow>
            ) : (
              items.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>
                    <Typography fontWeight={700}>{o.order_number}</Typography>
                  </TableCell>
                  <TableCell>
                    {new Date(o.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {o.items.reduce((n, x) => n + x.quantity, 0)} units
                  </TableCell>
                  <TableCell>{o.invoice_number}</TableCell>
                  <TableCell>
                    <Chip size="small" color="success" label={o.status} />
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 750 }}>
                    ${Number(o.total_amount).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}
