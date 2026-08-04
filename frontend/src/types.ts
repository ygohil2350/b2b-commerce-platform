export type Role = "supplier" | "buyer";
export interface User {
  id: string;
  email: string;
  full_name: string;
  role: Role;
}
export interface Category {
  id: number;
  name: string;
}
export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: Category;
  price: string;
  stock_quantity: number;
  reorder_level: number;
  updated_at: string;
}
export interface ProductPage {
  items: Product[];
  total: number;
  page: number;
  page_size: number;
}
export interface Filters {
  search: string;
  category_id: string;
  availability: string;
  sort: string;
  min_price: string;
  max_price: string;
}
export interface Dashboard {
  total_products: number;
  total_units: number;
  inventory_value: string;
  low_stock_count: number;
  trends: { day: string; stock_in: number; order_out: number }[];
}
export interface OrderItem {
  product_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: string;
  line_total: string;
}
export interface Order {
  id: string;
  order_number: string;
  status: string;
  total_amount: string;
  invoice_number: string;
  created_at: string;
  items: OrderItem[];
}
