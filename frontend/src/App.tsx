import { useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "./store";
import { Login } from "./components/Login";
import { Layout, type Page } from "./components/Layout";
import { Dashboard } from "./components/Dashboard";
import { Products } from "./components/Products";
import { Cart } from "./components/Cart";
import { Orders } from "./components/Orders";
export default function App() {
  const user = useSelector((s: RootState) => s.auth.user);
  const [page, setPage] = useState<Page>("dashboard");
  if (!user) return <Login />;
  return (
    <Layout page={page} setPage={setPage}>
      {page === "dashboard" ? (
        <Dashboard />
      ) : page === "products" ? (
        <Products />
      ) : page === "cart" ? (
        <Cart onComplete={() => setPage("orders")} />
      ) : (
        <Orders />
      )}
    </Layout>
  );
}
