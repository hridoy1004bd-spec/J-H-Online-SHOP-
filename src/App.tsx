import React from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { applyTheme } from "./utils/theme";
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
import Reviews from "./pages/customer/Reviews";
import FaqPage from "./pages/customer/Faq";
import Favorites from "./pages/customer/Favorites";
import TrackOrder from "./pages/customer/TrackOrder";
import TelecomReseller from "./pages/customer/TelecomReseller";
import DropshipperPanel from "./pages/customer/DropshipperPanel";
import DropshipLink from "./pages/customer/DropshipLink";

import AdminLogin from "./pages/admin/AdminLogin";
import Dashboard from "./pages/admin/Dashboard";
import AddProduct from "./pages/admin/AddProduct";
import EditProduct from "./pages/admin/EditProduct";
import ProductList from "./pages/admin/ProductList";
import AdminOrders from "./pages/admin/AdminOrders";
import Customers from "./pages/admin/Customers";
import CustomerDetail from "./pages/admin/CustomerDetail";
import GiftCards from "./pages/admin/GiftCards";
import Sales from "./pages/admin/Sales";
import Balance from "./pages/admin/Balance";
import PaymentSettings from "./pages/admin/PaymentSettings";
import Settings from "./pages/admin/Settings";
import Support from "./pages/admin/Support";
import Banners from "./pages/admin/Banners";
import Notices from "./pages/admin/Notices";
import FeaturedBanners from "./pages/admin/FeaturedBanners";
import AdminReviews from "./pages/admin/AdminReviews";
import AdminMenu from "./pages/admin/AdminMenu";
import AdminFaq from "./pages/admin/AdminFaq";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminTelecom from "./pages/admin/AdminTelecom";
import AdminDropship from "./pages/admin/AdminDropship";

function ThemeSync() {
  const { pathname } = useLocation();
  React.useEffect(() => {
    applyTheme(pathname);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
    <ThemeSync />
    <Routes>
      <Route element={<CustomerLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/search" element={<Search />} />
        <Route path="/product/:id" element={<ProductDetails />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/account" element={<Account />} />
        <Route path="/reviews" element={<Reviews />} />
        <Route path="/faq" element={<FaqPage />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/track" element={<TrackOrder />} />
        <Route path="/telecom" element={<TelecomReseller />} />
        <Route path="/dropshipper" element={<DropshipperPanel />} />
        <Route path="/ds/:code/:pid" element={<DropshipLink />} />
      </Route>

      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="products" element={<ProductList />} />
        <Route path="products/new" element={<AddProduct />} />
        <Route path="products/:id/edit" element={<EditProduct />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="customers" element={<Customers />} />
        <Route path="customers/:id" element={<CustomerDetail />} />
        <Route path="gift-cards" element={<GiftCards />} />
        <Route path="sales" element={<Sales />} />
        <Route path="balance" element={<Balance />} />
        <Route path="payments" element={<PaymentSettings />} />
        <Route path="settings" element={<Settings />} />
        <Route path="support" element={<Support />} />
        <Route path="banners" element={<Banners />} />
        <Route path="notices" element={<Notices />} />
        <Route path="featured-banners" element={<FeaturedBanners />} />
        <Route path="reviews" element={<AdminReviews />} />
        <Route path="menu" element={<AdminMenu />} />
        <Route path="faq" element={<AdminFaq />} />
        <Route path="categories" element={<AdminCategories />} />
        <Route path="telecom" element={<AdminTelecom />} />
        <Route path="dropship" element={<AdminDropship />} />
      </Route>
    </Routes>
    </>
  );
}
