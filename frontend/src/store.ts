import {
  configureStore,
  createAsyncThunk,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { api } from "./api";
import type { Filters, Order, Product, ProductPage, User } from "./types";

const savedUser = localStorage.getItem("user");
const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: savedUser ? (JSON.parse(savedUser) as User) : null,
    loading: false,
    error: "",
  },
  reducers: {
    loginStart: (s) => {
      s.loading = true;
      s.error = "";
    },
    loginSuccess: (
      s,
      a: PayloadAction<{ user: User; access_token: string }>,
    ) => {
      s.loading = false;
      s.user = a.payload.user;
      localStorage.setItem("user", JSON.stringify(a.payload.user));
      localStorage.setItem("access_token", a.payload.access_token);
    },
    loginFail: (s, a: PayloadAction<string>) => {
      s.loading = false;
      s.error = a.payload;
    },
    logout: (s) => {
      s.user = null;
      localStorage.removeItem("user");
      localStorage.removeItem("access_token");
    },
  },
});

export const fetchProducts = createAsyncThunk(
  "catalog/fetch",
  async (filters: Filters) => {
    const params = Object.fromEntries(
      Object.entries(filters).filter(
        ([, value]) => value !== "" && value !== "all",
      ),
    );
    return (await api.get<ProductPage>("/products", { params })).data;
  },
);
const catalogSlice = createSlice({
  name: "catalog",
  initialState: { products: [] as Product[], total: 0, loading: false },
  reducers: {},
  extraReducers: (builder) =>
    builder
      .addCase(fetchProducts.pending, (s) => {
        s.loading = true;
      })
      .addCase(fetchProducts.fulfilled, (s, a) => {
        s.loading = false;
        s.products = a.payload.items;
        s.total = a.payload.total;
      })
      .addCase(fetchProducts.rejected, (s) => {
        s.loading = false;
      }),
});

type CartLine = { product: Product; quantity: number };
const cartSlice = createSlice({
  name: "cart",
  initialState: { lines: [] as CartLine[] },
  reducers: {
    addToCart: (s, a: PayloadAction<Product>) => {
      const line = s.lines.find((x) => x.product.id === a.payload.id);
      if (line)
        line.quantity = Math.min(
          line.quantity + 1,
          line.product.stock_quantity,
        );
      else s.lines.push({ product: a.payload, quantity: 1 });
    },
    setQuantity: (s, a: PayloadAction<{ id: string; quantity: number }>) => {
      const line = s.lines.find((x) => x.product.id === a.payload.id);
      if (line)
        line.quantity = Math.max(
          1,
          Math.min(a.payload.quantity, line.product.stock_quantity),
        );
    },
    removeFromCart: (s, a: PayloadAction<string>) => {
      s.lines = s.lines.filter((x) => x.product.id !== a.payload);
    },
    clearCart: (s) => {
      s.lines = [];
    },
  },
});

export const fetchOrders = createAsyncThunk(
  "orders/fetch",
  async () => (await api.get<Order[]>("/orders")).data,
);
const ordersSlice = createSlice({
  name: "orders",
  initialState: { items: [] as Order[], loading: false },
  reducers: {},
  extraReducers: (builder) =>
    builder
      .addCase(fetchOrders.pending, (s) => {
        s.loading = true;
      })
      .addCase(fetchOrders.fulfilled, (s, a) => {
        s.loading = false;
        s.items = a.payload;
      }),
});

export const { loginStart, loginSuccess, loginFail, logout } =
  authSlice.actions;
export const { addToCart, setQuantity, removeFromCart, clearCart } =
  cartSlice.actions;
export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    catalog: catalogSlice.reducer,
    cart: cartSlice.reducer,
    orders: ordersSlice.reducer,
  },
});
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
