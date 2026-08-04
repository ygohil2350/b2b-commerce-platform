import { useEffect, useState } from "react";
import { AddRounded, SearchRounded } from "@mui/icons-material";
import {
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  InputAdornment,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { api } from "../api";
import {
  addToCart,
  fetchProducts,
  type AppDispatch,
  type RootState,
} from "../store";
import type { Category, Filters, Product } from "../types";
const initial: Filters = {
  search: "",
  category_id: "",
  availability: "all",
  sort: "name",
  min_price: "",
  max_price: "",
};
export function Products() {
  const dispatch = useDispatch<AppDispatch>();
  const { products, total, loading } = useSelector((s: RootState) => s.catalog);
  const user = useSelector((s: RootState) => s.auth.user)!;
  const [filters, setFilters] = useState(initial);
  const [categories, setCategories] = useState<Category[]>([]);
  useEffect(() => {
    api.get("/categories").then((r) => setCategories(r.data));
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => dispatch(fetchProducts(filters)), 250);
    return () => clearTimeout(timer);
  }, [dispatch, filters]);
  const set =
    (key: keyof Filters) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setFilters({ ...filters, [key]: e.target.value });
  const state = (
    p: Product,
  ): { label: string; color: "default" | "warning" | "success" } =>
    p.stock_quantity === 0
      ? { label: "Out of stock", color: "default" }
      : p.stock_quantity <= p.reorder_level
        ? { label: "Low stock", color: "warning" }
        : { label: "In stock", color: "success" };
  return (
    <>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4">Product catalog</Typography>
        <Typography color="text.secondary">
          {total} SKUs across the active inventory.
        </Typography>
      </Box>
      <Card sx={{ mb: 2 }}>
        <Box
          sx={{
            p: 2,
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "2fr repeat(3, 1fr)" },
            gap: 1.5,
          }}
        >
          <TextField
            size="small"
            placeholder="Search name or SKU"
            value={filters.search}
            onChange={set("search")}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRounded />
                  </InputAdornment>
                ),
              },
            }}
          />
          <TextField
            select
            size="small"
            label="Category"
            value={filters.category_id}
            onChange={set("category_id")}
          >
            <MenuItem value="">All categories</MenuItem>
            {categories.map((c) => (
              <MenuItem value={c.id} key={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Availability"
            value={filters.availability}
            onChange={set("availability")}
          >
            <MenuItem value="all">All stock</MenuItem>
            <MenuItem value="in_stock">In stock</MenuItem>
            <MenuItem value="low_stock">Low stock</MenuItem>
            <MenuItem value="out_of_stock">Out of stock</MenuItem>
          </TextField>
          <TextField
            select
            size="small"
            label="Sort"
            value={filters.sort}
            onChange={set("sort")}
          >
            <MenuItem value="name">Name A–Z</MenuItem>
            <MenuItem value="price_asc">Price low–high</MenuItem>
            <MenuItem value="price_desc">Price high–low</MenuItem>
            <MenuItem value="stock_asc">Stock low–high</MenuItem>
            <MenuItem value="stock_desc">Stock high–low</MenuItem>
          </TextField>
        </Box>
      </Card>
      <TableContainer component={Card}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Product</TableCell>
              <TableCell>Category</TableCell>
              <TableCell align="right">Unit price</TableCell>
              <TableCell align="right">Available</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : (
              products.map((p) => {
                const stockState = state(p);
                return (
                  <TableRow key={p.id} hover>
                    <TableCell>
                      <Typography fontWeight={700}>{p.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {p.sku}
                      </Typography>
                    </TableCell>
                    <TableCell>{p.category.name}</TableCell>
                    <TableCell align="right">
                      ${Number(p.price).toFixed(2)}
                    </TableCell>
                    <TableCell align="right">
                      <Typography fontWeight={700}>
                        {p.stock_quantity}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={stockState.label}
                        color={stockState.color}
                      />
                    </TableCell>
                    <TableCell align="right">
                      {user.role === "buyer" ? (
                        <Button
                          size="small"
                          startIcon={<AddRounded />}
                          disabled={!p.stock_quantity}
                          onClick={() => dispatch(addToCart(p))}
                        >
                          Add
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={async () => {
                            const quantity = Number(
                              prompt(`Units to add to ${p.sku}:`),
                            );
                            if (quantity > 0) {
                              await api.post(`/products/${p.id}/stock`, {
                                quantity,
                              });
                              dispatch(fetchProducts(filters));
                            }
                          }}
                        >
                          Receive stock
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}
