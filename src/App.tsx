import React from "react";
import { Route, Routes } from "react-router-dom";
import CustomerLayout from "./layouts/CustomerLayout";
import AdminLayout from "./layouts/AdminLayout";

import Home from "./pages/customer/Home";
import Categories from "./pages/customer/Categories";
import Search from "./pages/customer/Search";
import ProductDetails from "./pages/customer/ProductDetails";
import Cart from "./pages/customer/Cart";
import Checkout from "./pages/customer/Checkout";
import Orders from "./pages/customer/Orders";
import Account from "./pages/customer/Account";

import AdminLogin from "./pages/admin/AdminLogin";
import Dashboard from "./pages/admin/Dashboard";
import AddProduct from "./pages/admin/AddProduct";
import EditProduct from "./pages/admin/EditProduct";
import ProductList from "./pages/admin/ProductList";
import AdminOrders from "./pages/admin/AdminOrders";
import Customers from "./pages/admin/Customers";
import Sales from "./pages/admin/Sales";
import Balance from "./pages/admin/Balance";
import PaymentSettings from "./pages/admin/PaymentSettings";
import Settings from "./pages/admin/Settings";
import Support from "./pages/admin/Support";
import Banners from "./pages/admin/Banners";
import Notices from "./pages/admin/Notices";

export default function App() {
  return (
    <Routes>
      {/* Customer-facing storefront */}
      <Route element={<CustomerLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/search" element={<Search />} />
        <Route path="/product/:id" element={<ProductDetails />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/account" element={<Account />} />
      </Route>

      {/* Admin */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="products" element={<ProductList />} />
        <Route path="products/new" element={<AddProduct />} />
        <Route path="products/:id/edit" element={<EditProduct />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="customers" element={<Customers />} />
        <Route path="sales" element={<Sales />} />
        <Route path="balance" element={<Balance />} />
        <Route path="payments" element={<PaymentSettings />} />
        <Route path="settings" element={<Settings />} />
        <Route path="support" element={<Support />} />
        <Route path="banners" element={<Banners />} />
        <Route path="notices" element={<Notices />} />
      </Route>
    </Routes>
  );
}
