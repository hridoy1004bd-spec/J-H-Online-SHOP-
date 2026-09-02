import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  ShoppingBag, Search, Globe, User, ShoppingCart, Home, Grid3x3, Package,
  X, Plus, Minus, Star, ChevronLeft, ChevronRight, Check, Upload,
  LayoutDashboard, Trash2, Pencil, Truck, MapPin, Phone, MessageCircle,
  Bell, ArrowLeft, CircleCheck, Clock, XCircle, TrendingUp, Users2, Boxes,
  Menu
} from "lucide-react";

/* ---------------------------------------------------------
   J H Online SHOP — interactive frontend prototype
   Bilingual (বাংলা / English) customer app + admin dashboard
   All data is in-memory (demo). OTP is simulated on-screen.
---------------------------------------------------------- */

/* Brand palette derived from the actual J H Online SHOP logo: deep navy + gold */
const TEAL = "#122A52";       // primary navy (kept var name for minimal diff)
const TEAL_DARK = "#0A1B38";  // deeper navy
const TEAL_TINT = "#EDF1F8";  // pale navy tint
const ORANGE = "#D8A63C";     // gold accent (was orange)
const ORANGE_TINT = "#FBF2DD";
const GOLD_LIGHT = "#F0C866";
const INK = "#1D2733";
const MUTE = "#6B7686";

const T = {
  en: {
    appName: "J H Online SHOP", searchPh: "Search products, brands, SKU...",
    all: "All Products", women: "Women's", men: "Men's", kids: "Kids",
    fashion: "Fashion", inner: "Inner Products", newArr: "New Arrivals",
    best: "Best Sellers", offers: "Offers",
    hero1: "J H Online SHOP", hero2: "Quality fashion & lifestyle products at great prices",
    shopNow: "Shop Now",
    featured: "Featured Products", newArrivals: "New Arrivals",
    bestSelling: "Best Selling", discountProducts: "Discount Deals",
    recommended: "Recommended For You", recentlyViewed: "Recently Viewed",
    addToCart: "Add to Cart", buyNow: "Buy Now", outOfStock: "Out of Stock",
    inStock: "In Stock", lowStock: "Only {n} left",
    off: "OFF",
    home: "Home", categories: "Categories", orders: "Orders", cart: "Cart", account: "Account",
    yourCart: "Your Cart", cartEmpty: "Your cart is empty",
    cartEmptySub: "Add products you like — they'll show up here.",
    subtotal: "Subtotal", delivery: "Delivery Charge", total: "Total",
    orderNow: "Order Now", removeItem: "Remove",
    productCode: "Product Code", rating: "Rating", reviews: "reviews",
    description: "Description", size: "Size", color: "Color", quantity: "Quantity",
    selectSize: "Select a size", relatedProducts: "Related Products",
    deliveryInfo: "Delivery Information", returnPolicy: "Return Policy",
    deliveryInfoText: "Inside Dhaka: ৳60 (2-3 days) · Outside Dhaka: ৳120 (3-5 days)",
    returnPolicyText: "Easy 3-day exchange if the product has a defect.",
    checkoutTitle: "Checkout", yourName: "Your Name", namePh: "Enter your full name",
    mobileNumber: "Mobile Number", mobilePh: "01XXXXXXXXX", sendOtp: "Send OTP",
    enterOtp: "Enter the 4-digit code", otpDemoNote: "Demo mode — your code is",
    verify: "Verify & Continue", resend: "Resend OTP", changeNumber: "Change number",
    deliveryAddress: "Delivery Address", fullAddress: "Full Address (house, road)",
    area: "Area", city: "City / District", landmark: "Landmark (optional)",
    orderSummary: "Order Summary", paymentMethod: "Payment Method",
    cod: "Cash on Delivery", codNote: "More payment methods (bKash, Nagad, Card) coming soon",
    confirmOrder: "Confirm Order", placingOrder: "Placing your order...",
    orderPlaced: "Order placed successfully!", orderPlacedSub: "We'll call you shortly to confirm delivery.",
    orderId: "Order ID", orderDate: "Order Date", orderTotal: "Order Total",
    trackOrder: "Track Order", backHome: "Back to Home",
    myOrders: "My Orders", noOrders: "No orders yet",
    noOrdersSub: "Orders you place will show up here.",
    statusPending: "Pending", statusConfirmed: "Confirmed", statusProcessing: "Processing",
    statusShipped: "Shipped", statusDelivered: "Delivered", statusCancelled: "Cancelled",
    cancelOrder: "Cancel Order", cancelled: "Order cancelled",
    myAccount: "My Account", notLoggedIn: "You're browsing as a guest",
    notLoggedInSub: "Place an order to create your account automatically — no password needed.",
    logout: "Log out", contactSupport: "Contact Support", whatsapp: "WhatsApp",
    callUs: "Call Us", welcomeBack: "Welcome back",
    admin: "Admin Dashboard", adminLogin: "Admin Login", adminUser: "Username",
    adminPass: "Password", login: "Log In", exitAdmin: "Exit Admin",
    totalProducts: "Total Products", activeProducts: "Active Products",
    outOfStockCount: "Out of Stock", totalOrders: "Total Orders",
    pendingOrders: "Pending Orders", totalSales: "Total Sales",
    todaySales: "Today's Sales", totalCustomers: "Total Customers",
    addProduct: "Add New Product", allProducts: "All Products",
    productName: "Product Name (Bangla or English)", productNamePh: "e.g. Premium China Foam Bra",
    autoTranslate: "Auto-translated version (editable)",
    oldPrice: "Old Price (৳)", currentPrice: "Current Price (৳)", category: "Category",
    sizesAvail: "Available Sizes (comma separated)", sizesPh: "32, 34, 36, 38",
    stockQty: "Stock Quantity", uploadImage: "Click to upload product image",
    publish: "Publish Product", published: "Product published!",
    discount: "Discount", productList: "Product List", edit: "Edit", delete: "Delete",
    orderMgmt: "Order Management", customer: "Customer", amount: "Amount",
    status: "Status", noProductsYet: "No products yet — add your first one!",
    langLine: "বাংলা", searchResults: "Search results for",
    noResults: "No products found", filters: "Filters", priceRange: "Price Range",
    sortBy: "Sort by", newest: "Newest", priceLow: "Price: Low to High", priceHigh: "Price: High to Low",
    close: "Close", viewAll: "View all",
  },
  bn: {
    appName: "জে এইচ অনলাইন শপ", searchPh: "পণ্য, ব্র্যান্ড, SKU খুঁজুন...",
    all: "সকল পণ্য", women: "মহিলাদের", men: "পুরুষদের", kids: "কিডস",
    fashion: "ফ্যাশন", inner: "ইনার প্রোডাক্টস", newArr: "নতুন সংগ্রহ",
    best: "বেস্ট সেলার", offers: "অফার",
    hero1: "জে এইচ অনলাইন শপ", hero2: "ভালো দামে মানসম্মত ফ্যাশন ও লাইফস্টাইল পণ্য কিনুন",
    shopNow: "কিনুন এখনই",
    featured: "ফিচার্ড পণ্য", newArrivals: "নতুন সংগ্রহ",
    bestSelling: "বেস্ট সেলিং", discountProducts: "ছাড়ের পণ্য",
    recommended: "আপনার জন্য প্রস্তাবিত", recentlyViewed: "সম্প্রতি দেখা",
    addToCart: "কার্টে যোগ করুন", buyNow: "এখনই কিনুন", outOfStock: "স্টক নেই",
    inStock: "স্টক আছে", lowStock: "মাত্র {n}টি বাকি",
    off: "ছাড়",
    home: "হোম", categories: "ক্যাটাগরি", orders: "অর্ডার", cart: "কার্ট", account: "অ্যাকাউন্ট",
    yourCart: "আপনার কার্ট", cartEmpty: "আপনার কার্ট খালি",
    cartEmptySub: "পছন্দের পণ্য যোগ করুন — সেগুলো এখানে দেখা যাবে।",
    subtotal: "সাবটোটাল", delivery: "ডেলিভারি চার্জ", total: "মোট",
    orderNow: "অর্ডার করুন", removeItem: "সরান",
    productCode: "প্রোডাক্ট কোড", rating: "রেটিং", reviews: "রিভিউ",
    description: "বিবরণ", size: "সাইজ", color: "রঙ", quantity: "পরিমাণ",
    selectSize: "একটি সাইজ বাছাই করুন", relatedProducts: "সম্পর্কিত পণ্য",
    deliveryInfo: "ডেলিভারি তথ্য", returnPolicy: "রিটার্ন নীতি",
    deliveryInfoText: "ঢাকার ভিতরে: ৳৬০ (২-৩ দিন) · ঢাকার বাইরে: ৳১২০ (৩-৫ দিন)",
    returnPolicyText: "পণ্যে ত্রুটি থাকলে ৩ দিনের মধ্যে সহজে এক্সচেঞ্জ করা যাবে।",
    checkoutTitle: "চেকআউট", yourName: "আপনার নাম", namePh: "আপনার পুরো নাম লিখুন",
    mobileNumber: "মোবাইল নম্বর", mobilePh: "01XXXXXXXXX", sendOtp: "OTP পাঠান",
    enterOtp: "৪-সংখ্যার কোড লিখুন", otpDemoNote: "ডেমো মোড — আপনার কোড",
    verify: "যাচাই করে এগিয়ে যান", resend: "আবার পাঠান", changeNumber: "নম্বর পরিবর্তন করুন",
    deliveryAddress: "ডেলিভারি ঠিকানা", fullAddress: "সম্পূর্ণ ঠিকানা (বাড়ি, রোড)",
    area: "এলাকা", city: "শহর / জেলা", landmark: "ল্যান্ডমার্ক (ঐচ্ছিক)",
    orderSummary: "অর্ডার সারাংশ", paymentMethod: "পেমেন্ট পদ্ধতি",
    cod: "ক্যাশ অন ডেলিভারি", codNote: "শীঘ্রই আসছে: বিকাশ, নগদ, কার্ড পেমেন্ট",
    confirmOrder: "অর্ডার নিশ্চিত করুন", placingOrder: "অর্ডার প্লেস হচ্ছে...",
    orderPlaced: "অর্ডার সফলভাবে সম্পন্ন হয়েছে!", orderPlacedSub: "ডেলিভারি নিশ্চিত করতে আমরা শীঘ্রই কল করব।",
    orderId: "অর্ডার আইডি", orderDate: "অর্ডারের তারিখ", orderTotal: "অর্ডার মোট",
    trackOrder: "অর্ডার ট্র্যাক করুন", backHome: "হোমে ফিরুন",
    myOrders: "আমার অর্ডার", noOrders: "এখনো কোনো অর্ডার নেই",
    noOrdersSub: "আপনার অর্ডারগুলো এখানে দেখা যাবে।",
    statusPending: "পেন্ডিং", statusConfirmed: "নিশ্চিত হয়েছে", statusProcessing: "প্রসেসিং",
    statusShipped: "পাঠানো হয়েছে", statusDelivered: "ডেলিভার হয়েছে", statusCancelled: "বাতিল হয়েছে",
    cancelOrder: "অর্ডার বাতিল করুন", cancelled: "অর্ডার বাতিল হয়েছে",
    myAccount: "আমার অ্যাকাউন্ট", notLoggedIn: "আপনি গেস্ট হিসেবে ব্রাউজ করছেন",
    notLoggedInSub: "অর্ডার করলেই স্বয়ংক্রিয়ভাবে অ্যাকাউন্ট তৈরি হবে — পাসওয়ার্ড লাগবে না।",
    logout: "লগ আউট", contactSupport: "সাপোর্টে যোগাযোগ করুন", whatsapp: "হোয়াটসঅ্যাপ",
    callUs: "কল করুন", welcomeBack: "স্বাগতম",
    admin: "অ্যাডমিন ড্যাশবোর্ড", adminLogin: "অ্যাডমিন লগইন", adminUser: "ইউজারনেম",
    adminPass: "পাসওয়ার্ড", login: "লগইন", exitAdmin: "অ্যাডমিন থেকে বের হন",
    totalProducts: "মোট পণ্য", activeProducts: "সক্রিয় পণ্য",
    outOfStockCount: "স্টক নেই", totalOrders: "মোট অর্ডার",
    pendingOrders: "পেন্ডিং অর্ডার", totalSales: "মোট বিক্রয়",
    todaySales: "আজকের বিক্রয়", totalCustomers: "মোট কাস্টমার",
    addProduct: "নতুন পণ্য যোগ করুন", allProducts: "সকল পণ্য",
    productName: "পণ্যের নাম (বাংলা বা ইংরেজি)", productNamePh: "যেমন: প্রিমিয়াম চায়না ফোম ব্রা",
    autoTranslate: "স্বয়ংক্রিয় অনুবাদ (সম্পাদনাযোগ্য)",
    oldPrice: "পুরাতন মূল্য (৳)", currentPrice: "বর্তমান মূল্য (৳)", category: "ক্যাটাগরি",
    sizesAvail: "সাইজ (কমা দিয়ে আলাদা করুন)", sizesPh: "৩২, ৩৪, ৩৬, ৩৮",
    stockQty: "স্টক পরিমাণ", uploadImage: "পণ্যের ছবি আপলোড করতে ক্লিক করুন",
    publish: "পণ্য প্রকাশ করুন", published: "পণ্য প্রকাশিত হয়েছে!",
    discount: "ছাড়", productList: "পণ্যের তালিকা", edit: "সম্পাদনা", delete: "মুছুন",
    orderMgmt: "অর্ডার ম্যানেজমেন্ট", customer: "কাস্টমার", amount: "পরিমাণ",
    status: "অবস্থা", noProductsYet: "এখনো কোনো পণ্য নেই — প্রথমটি যোগ করুন!",
    langLine: "EN", searchResults: "অনুসন্ধানের ফলাফল",
    noResults: "কোনো পণ্য পাওয়া যায়নি", filters: "ফিল্টার", priceRange: "মূল্য পরিসীমা",
    sortBy: "সাজান", newest: "নতুন", priceLow: "মূল্য: কম থেকে বেশি", priceHigh: "মূল্য: বেশি থেকে কম",
    close: "বন্ধ করুন", viewAll: "সব দেখুন",
  },
};

const CATS = [
  { id: "all", en: "All Products", bn: "সকল পণ্য", icon: "🛍️" },
  { id: "women", en: "Women's", bn: "মহিলাদের", icon: "👗" },
  { id: "men", en: "Men's", bn: "পুরুষদের", icon: "👕" },
  { id: "kids", en: "Kids", bn: "কিডস", icon: "🧸" },
  { id: "fashion", en: "Fashion", bn: "ফ্যাশন", icon: "👜" },
  { id: "inner", en: "Inner Products", bn: "ইনার প্রোডাক্টস", icon: "🩱" },
  { id: "newArr", en: "New Arrivals", bn: "নতুন সংগ্রহ", icon: "✨" },
  { id: "best", en: "Best Sellers", bn: "বেস্ট সেলার", icon: "🔥" },
  { id: "offers", en: "Offers", bn: "অফার", icon: "🏷️" },
];

const GRADIENTS = [
  "linear-gradient(135deg,#122A52,#0A1B38)", "linear-gradient(135deg,#D8A63C,#B9860F)",
  "linear-gradient(135deg,#1E3A63,#0E2245)", "linear-gradient(135deg,#E3B75E,#C4922E)",
  "linear-gradient(135deg,#2C4A75,#122A52)", "linear-gradient(135deg,#F0C866,#D8A63C)",
  "linear-gradient(135deg,#0A1B38,#D8A63C)", "linear-gradient(135deg,#3A5580,#1C2E4E)",
];

const seedProducts = [
  { id: "p1", cat: "inner", emoji: "🩱", nameEn: "Premium China Foam Bra", nameBn: "প্রিমিয়াম চায়না ফোম ব্রা", descEn: "Soft, breathable foam bra with adjustable straps. Everyday comfort fit.", descBn: "নরম, বাতাস চলাচলকারী ফোম ব্রা, অ্যাডজাস্টেবল স্ট্র্যাপসহ। নিত্যদিনের আরামদায়ক ফিট।", oldPrice: 599, price: 499, sizes: ["32", "34", "36", "38"], colors: ["Black", "Skin", "White"], sku: "JH-BRA-101", stock: { "32": 10, "34": 15, "36": 8, "38": 4 }, rating: 4.5, reviews: 128, tags: ["best", "newArr"] },
  { id: "p2", cat: "women", emoji: "👗", nameEn: "Georgette Party Saree", nameBn: "জর্জেট পার্টি শাড়ি", descEn: "Elegant georgette saree with embroidered border, perfect for occasions.", descBn: "এমব্রয়ডারি পাড়ের এলিগেন্ট জর্জেট শাড়ি, বিশেষ অনুষ্ঠানের জন্য উপযুক্ত।", oldPrice: 2200, price: 1590, sizes: ["Free Size"], colors: ["Maroon", "Navy", "Green"], sku: "JH-SAR-204", stock: { "Free Size": 22 }, rating: 4.7, reviews: 84, tags: ["offers", "best"] },
  { id: "p3", cat: "men", emoji: "👕", nameEn: "Cotton Polo T-Shirt", nameBn: "কটন পোলো টি-শার্ট", descEn: "100% cotton polo tee, breathable fabric, regular fit.", descBn: "১০০% কটন পোলো টি-শার্ট, আরামদায়ক কাপড়, রেগুলার ফিট।", oldPrice: 850, price: 650, sizes: ["M", "L", "XL", "XXL"], colors: ["Teal", "Black", "White", "Maroon"], sku: "JH-POL-055", stock: { M: 12, L: 20, XL: 14, XXL: 0 }, rating: 4.3, reviews: 210, tags: ["newArr"] },
  { id: "p4", cat: "kids", emoji: "🧸", nameEn: "Kids Cartoon Frock", nameBn: "কিডস কার্টুন ফ্রক", descEn: "Soft cotton frock for girls with cartoon print, comfortable daily wear.", descBn: "মেয়েদের জন্য কার্টুন প্রিন্টের নরম কটন ফ্রক, দৈনন্দিন আরামদায়ক পোশাক।", oldPrice: 750, price: 590, sizes: ["2-3Y", "4-5Y", "6-7Y"], colors: ["Pink", "Yellow"], sku: "JH-KID-019", stock: { "2-3Y": 9, "4-5Y": 11, "6-7Y": 6 }, rating: 4.6, reviews: 57, tags: ["best"] },
  { id: "p5", cat: "fashion", emoji: "👜", nameEn: "Ladies Handbag", nameBn: "লেডিস হ্যান্ডব্যাগ", descEn: "Premium PU leather handbag with adjustable strap and multiple pockets.", descBn: "প্রিমিয়াম পিইউ লেদার হ্যান্ডব্যাগ, অ্যাডজাস্টেবল স্ট্র্যাপ ও একাধিক পকেটসহ।", oldPrice: 1400, price: 990, sizes: ["Free Size"], colors: ["Tan", "Black"], sku: "JH-BAG-077", stock: { "Free Size": 17 }, rating: 4.4, reviews: 63, tags: ["offers"] },
  { id: "p6", cat: "women", emoji: "🧕", nameEn: "Chiffon Hijab Set", nameBn: "শিফন হিজাব সেট", descEn: "Premium chiffon hijab, 3-piece set, wrinkle free fabric.", descBn: "প্রিমিয়াম শিফন হিজাব, ৩ পিস সেট, ভাঁজমুক্ত কাপড়।", oldPrice: 450, price: 349, sizes: ["Free Size"], colors: ["Black", "Beige", "Grey"], sku: "JH-HIJ-033", stock: { "Free Size": 30 }, rating: 4.8, reviews: 145, tags: ["newArr", "best"] },
  { id: "p7", cat: "men", emoji: "👖", nameEn: "Slim Fit Denim Jeans", nameBn: "স্লিম ফিট ডেনিম জিন্স", descEn: "Stretchable slim fit denim jeans, durable stitching.", descBn: "স্ট্রেচেবল স্লিম ফিট ডেনিম জিন্স, টেকসই সেলাই।", oldPrice: 1650, price: 1290, sizes: ["30", "32", "34", "36"], colors: ["Blue", "Black"], sku: "JH-JNS-088", stock: { "30": 8, "32": 13, "34": 10, "36": 0 }, rating: 4.2, reviews: 96, tags: ["offers"] },
  { id: "p8", cat: "inner", emoji: "🧦", nameEn: "Cotton Ankle Socks (3 Pairs)", nameBn: "কটন এ্যাংকল মোজা (৩ জোড়া)", descEn: "Breathable cotton ankle socks, pack of 3 pairs.", descBn: "বাতাস চলাচলকারী কটন এ্যাংকল মোজা, ৩ জোড়ার প্যাক।", oldPrice: 300, price: 220, sizes: ["Free Size"], colors: ["Mixed"], sku: "JH-SOK-012", stock: { "Free Size": 40 }, rating: 4.1, reviews: 39, tags: ["best"] },
];

const uid = () => Math.random().toString(36).slice(2, 9);
const money = (n) => "৳" + Number(n).toLocaleString("en-US");
const pct = (oldP, newP) => oldP > 0 ? Math.round(((oldP - newP) / oldP) * 100) : 0;

const STORAGE = {
  products: "jh_online_shop_products_v2",
  cart: "jh_online_shop_cart_v2",
  orders: "jh_online_shop_orders_v2",
  customer: "jh_online_shop_customer_v2",
  lang: "jh_online_shop_lang_v2",
};

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function imageStyle(src, alt = "") {
  return { src, alt, style: { width: "100%", height: "100%", objectFit: "cover", display: "block" } };
}

export default function App() {
  const [lang, setLang] = useState(() => loadJSON(STORAGE.lang, "en"));
  const t = T[lang];
  const [view, setView] = useState("home"); // home, product, cart, checkout, orders, account, admin, search
  const [activeCat, setActiveCat] = useState("all");
  const [products, setProducts] = useState(() => loadJSON(STORAGE.products, seedProducts));
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cart, setCart] = useState(() => loadJSON(STORAGE.cart, []));
  const [orders, setOrders] = useState(() => loadJSON(STORAGE.orders, []).map(o => ({ ...o, date: new Date(o.date) })));
  const [customer, setCustomer] = useState(() => loadJSON(STORAGE.customer, null)); // {name, mobile}
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [recentlyViewed, setRecentlyViewed] = useState([]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2200); };

  useEffect(() => { saveJSON(STORAGE.products, products); }, [products]);
  useEffect(() => { saveJSON(STORAGE.cart, cart); }, [cart]);
  useEffect(() => { saveJSON(STORAGE.orders, orders); }, [orders]);
  useEffect(() => {
    if (customer) saveJSON(STORAGE.customer, customer);
    else localStorage.removeItem(STORAGE.customer);
  }, [customer]);
  useEffect(() => { saveJSON(STORAGE.lang, lang); }, [lang]);

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const cartSubtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const deliveryCharge = cart.length ? 60 : 0;

  const filteredProducts = useMemo(() => {
    let list = products;
    if (activeCat !== "all") {
      if (activeCat === "newArr" || activeCat === "best" || activeCat === "offers") {
        list = list.filter((p) => p.tags?.includes(activeCat));
      } else {
        list = list.filter((p) => p.cat === activeCat);
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) => p.nameEn.toLowerCase().includes(q) || p.nameBn.includes(q) || p.sku.toLowerCase().includes(q) || p.cat.includes(q)
      );
    }
    return list;
  }, [products, activeCat, searchQuery]);

  function openProduct(p) {
    setSelectedProduct(p);
    setView("product");
    setRecentlyViewed((rv) => [p, ...rv.filter((x) => x.id !== p.id)].slice(0, 6));
    window.scrollTo(0, 0);
  }

  function addToCart(product, size, color, qty) {
    setCart((c) => {
      const idx = c.findIndex((i) => i.id === product.id && i.size === size && i.color === color);
      if (idx > -1) {
        const copy = [...c];
        copy[idx].qty += qty;
        return copy;
      }
      return [...c, { id: product.id, nameEn: product.nameEn, nameBn: product.nameBn, price: product.price, oldPrice: product.oldPrice, emoji: product.emoji, image: product.image || "", gradient: GRADIENTS[product.nameEn.length % GRADIENTS.length], size, color, qty }];
    });
    showToast(lang === "en" ? "Added to cart" : "কার্টে যোগ হয়েছে");
  }

  function updateQty(idx, delta) {
    setCart((c) => {
      const copy = [...c];
      copy[idx].qty = Math.max(1, copy[idx].qty + delta);
      return copy;
    });
  }
  function removeFromCart(idx) {
    setCart((c) => c.filter((_, i) => i !== idx));
  }

  function placeOrder({ address, area, city, landmark }) {
    const order = {
      id: "JH" + Math.floor(100000 + Math.random() * 900000),
      date: new Date(),
      items: cart,
      subtotal: cartSubtotal,
      delivery: deliveryCharge,
      total: cartSubtotal + deliveryCharge,
      status: "pending",
      customer,
      address: { address, area, city, landmark },
      payment: "cod",
    };
    setOrders((o) => [order, ...o]);
    // reduce stock
    setProducts((prods) =>
      prods.map((p) => {
        const item = cart.find((i) => i.id === p.id);
        if (!item) return p;
        const newStock = { ...p.stock, [item.size]: Math.max(0, (p.stock[item.size] || 0) - item.qty) };
        return { ...p, stock: newStock };
      })
    );
    setCart([]);
    return order;
  }

  return (
    <div style={{ fontFamily: "'Hind Siliguri','Inter',sans-serif", background: "#FBFCFC", minHeight: "100vh", color: INK, paddingBottom: 74 }}>
      <style>{`
        * { box-sizing: border-box; }
        body { margin:0; }
        ::-webkit-scrollbar { display:none; }
        .scrollx { overflow-x:auto; -ms-overflow-style:none; scrollbar-width:none; }
        button { font-family:inherit; cursor:pointer; }
        input, select, textarea { font-family:inherit; }
        .press:active { transform: scale(0.97); }
      `}</style>

      {isAdmin ? (
        <AdminApp t={t} lang={lang} setLang={setLang} products={products} setProducts={setProducts}
          orders={orders} setOrders={setOrders} onExit={() => setIsAdmin(false)} showToast={showToast} />
      ) : (
        <>
          <Header t={t} lang={lang} setLang={setLang} cartCount={cartCount} view={view} setView={setView}
            searchOpen={searchOpen} setSearchOpen={setSearchOpen} searchQuery={searchQuery} setSearchQuery={setSearchQuery}
            customer={customer} onAdminClick={() => setIsAdmin(true)} />

          {(view === "home" || view === "search") && (
            <>
              {view === "home" && (
                <CategoryBar t={t} lang={lang} activeCat={activeCat} setActiveCat={(c) => { setActiveCat(c); }} />
              )}
              {(searchQuery || view === "search") ? (
                <SearchResults t={t} lang={lang} query={searchQuery} results={filteredProducts} openProduct={openProduct} addToCart={addToCart} />
              ) : (
                <HomePage t={t} lang={lang} products={products} activeCat={activeCat}
                  filteredProducts={filteredProducts} openProduct={openProduct} addToCart={addToCart}
                  recentlyViewed={recentlyViewed} />
              )}
            </>
          )}

          {view === "product" && selectedProduct && (
            <ProductDetail t={t} lang={lang} product={selectedProduct} onBack={() => setView("home")}
              addToCart={addToCart} onBuyNow={(size, color, qty) => { addToCart(selectedProduct, size, color, qty); setView("checkout"); }}
              related={products.filter((p) => p.cat === selectedProduct.cat && p.id !== selectedProduct.id).slice(0, 4)}
              openProduct={openProduct} />
          )}

          {view === "cart" && (
            <CartPage t={t} lang={lang} cart={cart} updateQty={updateQty} removeFromCart={removeFromCart}
              subtotal={cartSubtotal} delivery={deliveryCharge} onCheckout={() => setView("checkout")} onBack={() => setView("home")} />
          )}

          {view === "checkout" && (
            <CheckoutFlow t={t} lang={lang} cart={cart} subtotal={cartSubtotal} delivery={deliveryCharge}
              customer={customer} setCustomer={setCustomer} placeOrder={placeOrder}
              onDone={() => setView("orders")} onBack={() => setView("cart")} showToast={showToast} />
          )}

          {view === "orders" && (
            <OrdersPage t={t} lang={lang} orders={orders} setOrders={setOrders} onBack={() => setView("home")}
              onShop={() => setView("home")} />
          )}

          {view === "account" && (
            <AccountPage t={t} lang={lang} customer={customer} setCustomer={setCustomer} orders={orders}
              onGoOrders={() => setView("orders")} />
          )}

          <BottomNav t={t} view={view} setView={(v) => { setView(v); setSearchQuery(""); }} cartCount={cartCount} />
        </>
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: isAdmin ? 24 : 88, left: "50%", transform: "translateX(-50%)", background: INK, color: "#fff", padding: "10px 18px", borderRadius: 999, fontSize: 13.5, fontWeight: 500, zIndex: 200, boxShadow: "0 8px 24px rgba(0,0,0,0.2)", display: "flex", alignItems: "center", gap: 6 }}>
          <Check size={15} /> {toast}
        </div>
      )}
    </div>
  );
}

/* ---------------- Header ---------------- */
function Header({ t, lang, setLang, cartCount, view, setView, searchOpen, setSearchOpen, searchQuery, setSearchQuery, customer, onAdminClick }) {
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 50, background: "#fff", borderBottom: "1px solid #EFF2F1" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px" }}>
        <div onClick={() => setView("home")} style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer", flexShrink: 0 }}>
          <LogoMark size={36} />
          <div style={{ lineHeight: 1.05 }}>
            <div style={{ fontWeight: 800, fontSize: 14.5, letterSpacing: -0.2, color: TEAL_DARK }}>
              {lang === "en" ? <>J H <span style={{ color: ORANGE }}>Online SHOP</span></> : <span>জে এইচ <span style={{ color: ORANGE }}>অনলাইন শপ</span></span>}
            </div>
            <div style={{ fontSize: 8.5, color: MUTE, fontWeight: 600, letterSpacing: 0.2 }}>
              {lang === "en" ? "Shop with trust" : "বিশ্বাসের সাথে অনলাইন শপিং"}
            </div>
          </div>
        </div>

        {!searchOpen ? (
          <>
            <div style={{ flex: 1 }} />
            <IconBtn onClick={() => setSearchOpen(true)}><Search size={19} /></IconBtn>
            <button onClick={() => setLang(lang === "en" ? "bn" : "en")} style={{ border: `1px solid ${TEAL}`, background: TEAL_TINT, color: TEAL_DARK, borderRadius: 999, padding: "5px 10px", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
              <Globe size={13} /> {lang === "en" ? "বাংলা" : "EN"}
            </button>
            <IconBtn onClick={() => setView("account")}><User size={19} /></IconBtn>
            <IconBtn onClick={() => setView("cart")} badge={cartCount}><ShoppingCart size={19} /></IconBtn>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1, position: "relative" }}>
              <Search size={16} color={MUTE} style={{ position: "absolute", left: 12, top: 11 }} />
              <input autoFocus value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t.searchPh}
                style={{ width: "100%", padding: "9px 12px 9px 34px", borderRadius: 999, border: "1px solid #E3E7E6", background: "#F6F8F7", fontSize: 13.5, outline: "none" }} />
            </div>
            <button onClick={() => { setSearchOpen(false); setSearchQuery(""); }} style={{ border: "none", background: "none", color: MUTE, fontSize: 13, fontWeight: 600 }}>{t.close}</button>
          </div>
        )}
      </div>
      <div onClick={onAdminClick} style={{ textAlign: "center", fontSize: 10, color: "#C7CCCA", padding: "0 0 4px", cursor: "pointer" }}>
        {lang === "en" ? "Admin" : "অ্যাডমিন"}
      </div>
    </div>
  );
}

function LogoMark({ size = 36 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0, position: "relative",
      background: "#fff", border: `2px solid ${TEAL}`, display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: "inset 0 0 0 2px rgba(216,166,60,0.35)",
    }}>
      <div style={{ display: "flex", alignItems: "baseline", fontFamily: "'Inter',sans-serif" }}>
        <span style={{ fontWeight: 800, fontSize: size * 0.42, color: TEAL_DARK, fontStyle: "italic" }}>J</span>
        <span style={{ fontWeight: 800, fontSize: size * 0.42, color: ORANGE, fontStyle: "italic", marginLeft: -1 }}>H</span>
      </div>
      <div style={{ position: "absolute", right: -2, bottom: -2, width: size * 0.34, height: size * 0.34, borderRadius: "50%", background: ORANGE, border: "1.5px solid #fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <ShoppingBag size={size * 0.19} color="#fff" strokeWidth={3} />
      </div>
    </div>
  );
}

function IconBtn({ children, onClick, badge }) {
  return (
    <button onClick={onClick} className="press" style={{ position: "relative", border: "none", background: "none", padding: 6, color: INK, display: "flex" }}>
      {children}
      {!!badge && (
        <span style={{ position: "absolute", top: -2, right: -2, background: ORANGE, color: "#fff", fontSize: 9.5, fontWeight: 700, minWidth: 15, height: 15, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" }}>
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );
}

/* ---------------- Category Bar ---------------- */
function CategoryBar({ t, lang, activeCat, setActiveCat }) {
  return (
    <div className="scrollx" style={{ display: "flex", gap: 8, padding: "10px 14px", background: "#fff", borderBottom: "1px solid #F1F3F2" }}>
      {CATS.map((c) => {
        const active = activeCat === c.id;
        return (
          <button key={c.id} onClick={() => setActiveCat(c.id)} className="press"
            style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 999, border: active ? `1.5px solid ${TEAL}` : "1.5px solid #EEF1F0", background: active ? TEAL : "#fff", color: active ? "#fff" : INK, fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap" }}>
            <span style={{ fontSize: 14 }}>{c.icon}</span> {lang === "en" ? c.en : c.bn}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- Product Card ---------------- */
function ProductCard({ p, t, lang, onOpen, onAdd }) {
  const grad = GRADIENTS[p.nameEn.length % GRADIENTS.length];
  const discount = pct(p.oldPrice, p.price);
  const totalStock = Object.values(p.stock).reduce((a, b) => a + b, 0);
  const out = totalStock === 0;
  return (
    <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden", border: "1px solid #F0F2F1", display: "flex", flexDirection: "column" }}>
      <div onClick={() => onOpen(p)} style={{ position: "relative", height: 132, background: grad, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
        {p.image ? <img {...imageStyle(p.image, p.nameEn)} /> : <span style={{ fontSize: 46 }}>{p.emoji}</span>}
        {discount > 0 && (
          <div style={{ position: "absolute", top: 8, left: 8, background: ORANGE, color: "#fff", fontSize: 10.5, fontWeight: 800, padding: "3px 7px", borderRadius: 7 }}>
            -{discount}%
          </div>
        )}
        {out && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ background: INK, color: "#fff", fontSize: 10.5, fontWeight: 700, padding: "4px 10px", borderRadius: 999 }}>{t.outOfStock}</span>
          </div>
        )}
      </div>
      <div style={{ padding: "9px 10px 11px" }}>
        <div onClick={() => onOpen(p)} style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.3, cursor: "pointer", minHeight: 32, marginBottom: 4 }}>
          {lang === "en" ? p.nameEn : p.nameBn}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 3 }}>
          <span style={{ fontWeight: 800, fontSize: 14.5, color: TEAL_DARK }}>{money(p.price)}</span>
          {p.oldPrice > p.price && <span style={{ fontSize: 11.5, color: "#B0B6B4", textDecoration: "line-through" }}>{money(p.oldPrice)}</span>}
        </div>
        <div style={{ fontSize: 10.5, color: MUTE, marginBottom: 8 }}>
          {p.sizes.slice(0, 4).join(" · ")}
        </div>
        <button disabled={out} onClick={() => !out && onAdd(p, p.sizes[0], p.colors?.[0], 1)} className="press"
          style={{ width: "100%", padding: "7px 0", borderRadius: 999, border: "none", background: out ? "#EDEFEE" : TEAL_TINT, color: out ? "#AAB0AE" : TEAL_DARK, fontSize: 11.5, fontWeight: 700 }}>
          {out ? t.outOfStock : t.addToCart}
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ padding: "16px 14px 4px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <h3 style={{ fontSize: 15.5, fontWeight: 800, margin: 0, color: INK }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function ProductGrid({ products, t, lang, openProduct, addToCart }) {
  if (products.length === 0) return <div style={{ textAlign: "center", padding: "40px 0", color: MUTE, fontSize: 13.5 }}>{t.noResults}</div>;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
      {products.map((p) => <ProductCard key={p.id} p={p} t={t} lang={lang} onOpen={openProduct} onAdd={addToCart} />)}
    </div>
  );
}

/* ---------------- Home Page ---------------- */
function HomePage({ t, lang, products, activeCat, filteredProducts, openProduct, addToCart, recentlyViewed }) {
  if (activeCat !== "all") {
    return (
      <div style={{ padding: "16px 14px" }}>
        <ProductGrid products={filteredProducts} t={t} lang={lang} openProduct={openProduct} addToCart={addToCart} />
      </div>
    );
  }
  const newArrivals = products.filter((p) => p.tags?.includes("newArr"));
  const best = products.filter((p) => p.tags?.includes("best"));
  const discounted = [...products].sort((a, b) => pct(b.oldPrice, b.price) - pct(a.oldPrice, a.price)).slice(0, 4);

  return (
    <div>
      <div style={{ margin: "14px", borderRadius: 18, background: `linear-gradient(120deg, ${TEAL}, ${TEAL_DARK})`, padding: "22px 18px", color: "#fff", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: -20, top: -30, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
        <div style={{ position: "absolute", right: 30, bottom: -40, width: 90, height: 90, borderRadius: "50%", background: `rgba(242,118,12,0.25)` }} />
        <div style={{ position: "relative" }}>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>{t.hero1}</div>
          <div style={{ fontSize: 12.5, opacity: 0.9, marginBottom: 14, maxWidth: 220 }}>{t.hero2}</div>
          <button className="press" style={{ background: ORANGE, color: "#fff", border: "none", padding: "8px 18px", borderRadius: 999, fontWeight: 700, fontSize: 12.5 }}>{t.shopNow}</button>
        </div>
      </div>

      <Section title={t.featured}><ProductGrid products={products.slice(0, 4)} t={t} lang={lang} openProduct={openProduct} addToCart={addToCart} /></Section>
      <Section title={t.newArrivals}><ProductGrid products={newArrivals} t={t} lang={lang} openProduct={openProduct} addToCart={addToCart} /></Section>
      <Section title={t.discountProducts}><ProductGrid products={discounted} t={t} lang={lang} openProduct={openProduct} addToCart={addToCart} /></Section>
      <Section title={t.bestSelling}><ProductGrid products={best} t={t} lang={lang} openProduct={openProduct} addToCart={addToCart} /></Section>
      {recentlyViewed.length > 0 && (
        <Section title={t.recentlyViewed}><ProductGrid products={recentlyViewed} t={t} lang={lang} openProduct={openProduct} addToCart={addToCart} /></Section>
      )}
      <div style={{ height: 10 }} />
    </div>
  );
}

function SearchResults({ t, lang, query, results, openProduct, addToCart }) {
  return (
    <div style={{ padding: "16px 14px" }}>
      {query && <div style={{ fontSize: 12.5, color: MUTE, marginBottom: 10 }}>{t.searchResults} "{query}" ({results.length})</div>}
      <ProductGrid products={results} t={t} lang={lang} openProduct={openProduct} addToCart={addToCart} />
    </div>
  );
}

/* ---------------- Product Detail ---------------- */
function ProductDetail({ t, lang, product, onBack, addToCart, onBuyNow, related, openProduct }) {
  const [size, setSize] = useState(product.sizes[0]);
  const [color, setColor] = useState(product.colors?.[0]);
  const [qty, setQty] = useState(1);
  useEffect(() => { setSize(product.sizes[0]); setColor(product.colors?.[0]); setQty(1); }, [product.id]);

  const grad = GRADIENTS[product.nameEn.length % GRADIENTS.length];
  const discount = pct(product.oldPrice, product.price);
  const sizeStock = product.stock[size] ?? 0;
  const out = sizeStock === 0;

  return (
    <div>
      <div style={{ position: "relative", height: 300, background: grad, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <button onClick={onBack} className="press" style={{ position: "absolute", top: 12, left: 12, width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.9)", border: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ArrowLeft size={17} />
        </button>
        {product.image ? <img {...imageStyle(product.image, product.nameEn)} /> : <span style={{ fontSize: 90 }}>{product.emoji}</span>}
        {discount > 0 && <div style={{ position: "absolute", top: 14, right: 14, background: ORANGE, color: "#fff", fontSize: 12, fontWeight: 800, padding: "4px 10px", borderRadius: 8 }}>-{discount}% {t.off}</div>}
      </div>

      <div style={{ padding: "16px 16px 100px" }}>
        <div style={{ fontSize: 11, color: MUTE, marginBottom: 4 }}>{t.productCode}: {product.sku}</div>
        <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 6px" }}>{lang === "en" ? product.nameEn : product.nameBn}</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <div style={{ display: "flex", color: "#F5A623" }}>
            {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={14} fill={i <= Math.round(product.rating) ? "#F5A623" : "none"} strokeWidth={1.5} />)}
          </div>
          <span style={{ fontSize: 12, color: MUTE }}>{product.rating} ({product.reviews} {t.reviews})</span>
        </div>

        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 24, fontWeight: 800, color: TEAL_DARK }}>{money(product.price)}</span>
          {product.oldPrice > product.price && <span style={{ fontSize: 15, color: "#B0B6B4", textDecoration: "line-through" }}>{money(product.oldPrice)}</span>}
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 8 }}>{t.size}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {product.sizes.map((s) => {
              const disabled = (product.stock[s] ?? 0) === 0;
              return (
                <button key={s} disabled={disabled} onClick={() => setSize(s)} className="press"
                  style={{ minWidth: 44, padding: "7px 10px", borderRadius: 10, border: size === s ? `2px solid ${TEAL}` : "1.5px solid #E5E8E7", background: disabled ? "#F5F5F4" : (size === s ? TEAL_TINT : "#fff"), color: disabled ? "#C4C8C6" : INK, fontWeight: 700, fontSize: 12.5, textDecoration: disabled ? "line-through" : "none" }}>
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        {product.colors?.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 8 }}>{t.color}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {product.colors.map((c) => (
                <button key={c} onClick={() => setColor(c)} className="press"
                  style={{ padding: "7px 12px", borderRadius: 999, border: color === c ? `2px solid ${TEAL}` : "1.5px solid #E5E8E7", background: color === c ? TEAL_TINT : "#fff", fontSize: 12, fontWeight: 600 }}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 8 }}>{t.quantity}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, border: "1.5px solid #E5E8E7", borderRadius: 10, width: "fit-content", padding: "4px 6px" }}>
            <button onClick={() => setQty((q) => Math.max(1, q - 1))} style={{ border: "none", background: "none", padding: 6 }}><Minus size={14} /></button>
            <span style={{ fontWeight: 700, fontSize: 13, minWidth: 16, textAlign: "center" }}>{qty}</span>
            <button onClick={() => setQty((q) => Math.min(sizeStock || 1, q + 1))} style={{ border: "none", background: "none", padding: 6 }}><Plus size={14} /></button>
          </div>
          <div style={{ fontSize: 11, color: out ? "#D64545" : MUTE, marginTop: 6 }}>
            {out ? t.outOfStock : sizeStock <= 5 ? t.lowStock.replace("{n}", sizeStock) : t.inStock}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>{t.description}</div>
          <p style={{ fontSize: 13, color: "#454F5B", lineHeight: 1.6, margin: 0 }}>{lang === "en" ? product.descEn : product.descBn}</p>
        </div>

        <InfoRow icon={<Truck size={15} color={TEAL} />} title={t.deliveryInfo} text={t.deliveryInfoText} />
        <InfoRow icon={<CircleCheck size={15} color={TEAL} />} title={t.returnPolicy} text={t.returnPolicyText} />

        {related.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 14.5, fontWeight: 800, marginBottom: 10 }}>{t.relatedProducts}</div>
            <ProductGrid products={related} t={t} lang={lang} openProduct={openProduct} addToCart={() => {}} />
          </div>
        )}
      </div>

      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: "1px solid #EEF1F0", padding: "10px 14px", display: "flex", gap: 10, boxShadow: "0 -6px 18px rgba(0,0,0,0.05)", maxWidth: 480, margin: "0 auto" }}>
        <button disabled={out} onClick={() => addToCart(product, size, color, qty)} className="press" style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: `1.5px solid ${TEAL}`, background: "#fff", color: TEAL_DARK, fontWeight: 700, fontSize: 13, opacity: out ? 0.5 : 1 }}>
          {t.addToCart}
        </button>
        <button disabled={out} onClick={() => onBuyNow(size, color, qty)} className="press" style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: "none", background: out ? "#C9CDCB" : ORANGE, color: "#fff", fontWeight: 700, fontSize: 13 }}>
          {t.buyNow}
        </button>
      </div>
    </div>
  );
}

function InfoRow({ icon, title, text }) {
  return (
    <div style={{ display: "flex", gap: 10, padding: "10px 0", borderTop: "1px solid #F1F3F2" }}>
      <div style={{ marginTop: 1 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 12.5, fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: 11.5, color: MUTE, marginTop: 2 }}>{text}</div>
      </div>
    </div>
  );
}

/* ---------------- Cart ---------------- */
function CartPage({ t, lang, cart, updateQty, removeFromCart, subtotal, delivery, onCheckout, onBack }) {
  return (
    <div style={{ padding: "16px 14px 110px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <button onClick={onBack} style={{ border: "none", background: "none" }}><ArrowLeft size={19} /></button>
        <h2 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>{t.yourCart}</h2>
      </div>

      {cart.length === 0 ? (
        <EmptyState icon={<ShoppingCart size={38} color="#C9CDCB" />} title={t.cartEmpty} sub={t.cartEmptySub} />
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {cart.map((item, idx) => (
              <div key={idx} style={{ display: "flex", gap: 10, background: "#fff", border: "1px solid #F0F2F1", borderRadius: 14, padding: 10 }}>
                <div style={{ width: 60, height: 60, borderRadius: 10, background: item.gradient, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>{item.emoji}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 2 }}>{lang === "en" ? item.nameEn : item.nameBn}</div>
                  <div style={{ fontSize: 11, color: MUTE, marginBottom: 6 }}>{item.size}{item.color ? ` · ${item.color}` : ""}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid #E5E8E7", borderRadius: 8, padding: "2px 4px" }}>
                      <button onClick={() => updateQty(idx, -1)} style={{ border: "none", background: "none", padding: 3 }}><Minus size={12} /></button>
                      <span style={{ fontSize: 12, fontWeight: 700, minWidth: 12, textAlign: "center" }}>{item.qty}</span>
                      <button onClick={() => updateQty(idx, 1)} style={{ border: "none", background: "none", padding: 3 }}><Plus size={12} /></button>
                    </div>
                    <span style={{ fontWeight: 800, fontSize: 13, color: TEAL_DARK }}>{money(item.price * item.qty)}</span>
                  </div>
                </div>
                <button onClick={() => removeFromCart(idx)} style={{ border: "none", background: "none", color: "#C9CDCB", alignSelf: "flex-start" }}><Trash2 size={16} /></button>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 18, background: "#fff", border: "1px solid #F0F2F1", borderRadius: 14, padding: 14 }}>
            <Row label={t.subtotal} value={money(subtotal)} />
            <Row label={t.delivery} value={money(delivery)} />
            <div style={{ borderTop: "1px solid #EEF1F0", marginTop: 8, paddingTop: 8 }}>
              <Row label={t.total} value={money(subtotal + delivery)} bold />
            </div>
          </div>
        </>
      )}

      {cart.length > 0 && (
        <div style={{ position: "fixed", bottom: 62, left: 0, right: 0, background: "#fff", borderTop: "1px solid #EEF1F0", padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: 480, margin: "0 auto", boxShadow: "0 -6px 18px rgba(0,0,0,0.05)" }}>
          <div>
            <div style={{ fontSize: 10, color: MUTE }}>{t.total}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: TEAL_DARK }}>{money(subtotal + delivery)}</div>
          </div>
          <button onClick={onCheckout} className="press" style={{ background: ORANGE, color: "#fff", border: "none", padding: "12px 28px", borderRadius: 12, fontWeight: 700, fontSize: 13.5, display: "flex", alignItems: "center", gap: 6 }}>
            <ShoppingCart size={15} /> {t.orderNow}
          </button>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: bold ? 14 : 12.5, fontWeight: bold ? 800 : 500, color: bold ? INK : MUTE }}>
      <span>{label}</span><span style={{ color: bold ? TEAL_DARK : INK, fontWeight: bold ? 800 : 600 }}>{value}</span>
    </div>
  );
}

function EmptyState({ icon, title, sub, action }) {
  return (
    <div style={{ textAlign: "center", padding: "50px 20px" }}>
      <div style={{ marginBottom: 14 }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12.5, color: MUTE, maxWidth: 260, margin: "0 auto" }}>{sub}</div>
      {action}
    </div>
  );
}

/* ---------------- Checkout Flow ---------------- */
function CheckoutFlow({ t, lang, cart, subtotal, delivery, customer, setCustomer, placeOrder, onDone, onBack, showToast }) {
  const [step, setStep] = useState(customer ? "address" : "identify"); // identify, otp, address, done
  const [name, setName] = useState(customer?.name || "");
  const [mobile, setMobile] = useState(customer?.mobile || "");
  const [otp, setOtp] = useState("");
  const [genOtp, setGenOtp] = useState("");
  const [address, setAddress] = useState("");
  const [area, setArea] = useState("");
  const [city, setCity] = useState("");
  const [landmark, setLandmark] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [order, setOrder] = useState(null);

  function sendOtp() {
    if (!name.trim() || mobile.trim().length < 11) { showToast(lang === "en" ? "Enter valid name & mobile" : "সঠিক নাম ও মোবাইল দিন"); return; }
    const code = String(Math.floor(1000 + Math.random() * 9000));
    setGenOtp(code);
    setStep("otp");
    showToast((lang === "en" ? "OTP sent: " : "OTP পাঠানো হয়েছে: ") + code);
  }
  function verifyOtp() {
    if (otp === genOtp) {
      setCustomer({ name, mobile });
      setStep("address");
    } else {
      showToast(lang === "en" ? "Incorrect code, try again" : "ভুল কোড, আবার চেষ্টা করুন");
    }
  }
  function handleConfirm() {
    if (!address.trim() || !area.trim() || !city.trim()) { showToast(lang === "en" ? "Fill delivery address" : "ঠিকানা পূরণ করুন"); return; }
    setConfirming(true);
    setTimeout(() => {
      const o = placeOrder({ address, area, city, landmark });
      setOrder(o);
      setStep("done");
      setConfirming(false);
    }, 900);
  }

  if (step === "done" && order) {
    return (
      <div style={{ padding: "60px 24px", textAlign: "center" }}>
        <div style={{ width: 66, height: 66, borderRadius: "50%", background: TEAL_TINT, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
          <CircleCheck size={34} color={TEAL} />
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>{t.orderPlaced}</h2>
        <p style={{ fontSize: 12.5, color: MUTE, marginBottom: 22 }}>{t.orderPlacedSub}</p>
        <div style={{ background: "#fff", border: "1px solid #F0F2F1", borderRadius: 14, padding: 16, textAlign: "left", marginBottom: 20 }}>
          <Row label={t.orderId} value={order.id} bold />
          <Row label={t.orderDate} value={order.date.toLocaleDateString()} />
          <Row label={t.orderTotal} value={money(order.total)} bold />
        </div>
        <button onClick={onDone} className="press" style={{ width: "100%", padding: "13px 0", borderRadius: 12, border: "none", background: TEAL, color: "#fff", fontWeight: 700, fontSize: 13.5 }}>
          {t.trackOrder}
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "16px 14px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <button onClick={onBack} style={{ border: "none", background: "none" }}><ArrowLeft size={19} /></button>
        <h2 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>{t.checkoutTitle}</h2>
      </div>

      {step === "identify" && (
        <div>
          <Field label={t.yourName}><input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.namePh} style={inputStyle} /></Field>
          <Field label={t.mobileNumber}><input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder={t.mobilePh} style={inputStyle} /></Field>
          <button onClick={sendOtp} className="press" style={primaryBtn}>{t.sendOtp}</button>
        </div>
      )}

      {step === "otp" && (
        <div>
          <p style={{ fontSize: 12.5, color: MUTE, marginBottom: 4 }}>{t.enterOtp}</p>
          <p style={{ fontSize: 11.5, color: ORANGE, marginBottom: 14, fontWeight: 600 }}>{t.otpDemoNote}: {genOtp}</p>
          <input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="0000"
            style={{ ...inputStyle, textAlign: "center", fontSize: 22, letterSpacing: 10, fontWeight: 800, marginBottom: 14 }} />
          <button onClick={verifyOtp} className="press" style={primaryBtn}>{t.verify}</button>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
            <button onClick={sendOtp} style={{ border: "none", background: "none", color: TEAL_DARK, fontSize: 12, fontWeight: 600 }}>{t.resend}</button>
            <button onClick={() => setStep("identify")} style={{ border: "none", background: "none", color: MUTE, fontSize: 12, fontWeight: 600 }}>{t.changeNumber}</button>
          </div>
        </div>
      )}

      {step === "address" && (
        <div>
          <div style={{ background: TEAL_TINT, borderRadius: 12, padding: "10px 14px", marginBottom: 16, fontSize: 12.5, color: TEAL_DARK, fontWeight: 600 }}>
            {t.welcomeBack}, {customer?.name || name} · {customer?.mobile || mobile}
          </div>
          <Field label={t.fullAddress}><input value={address} onChange={(e) => setAddress(e.target.value)} style={inputStyle} /></Field>
          <div style={{ display: "flex", gap: 10 }}>
            <Field label={t.area} style={{ flex: 1 }}><input value={area} onChange={(e) => setArea(e.target.value)} style={inputStyle} /></Field>
            <Field label={t.city} style={{ flex: 1 }}><input value={city} onChange={(e) => setCity(e.target.value)} style={inputStyle} /></Field>
          </div>
          <Field label={t.landmark}><input value={landmark} onChange={(e) => setLandmark(e.target.value)} style={inputStyle} /></Field>

          <div style={{ marginTop: 8, marginBottom: 16 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 8 }}>{t.orderSummary}</div>
            <div style={{ background: "#fff", border: "1px solid #F0F2F1", borderRadius: 12, padding: 12 }}>
              {cart.map((item, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "4px 0", color: "#454F5B" }}>
                  <span>{lang === "en" ? item.nameEn : item.nameBn} × {item.qty} ({item.size})</span>
                  <span style={{ fontWeight: 700 }}>{money(item.price * item.qty)}</span>
                </div>
              ))}
              <div style={{ borderTop: "1px solid #EEF1F0", marginTop: 6, paddingTop: 6 }}>
                <Row label={t.subtotal} value={money(subtotal)} />
                <Row label={t.delivery} value={money(delivery)} />
                <Row label={t.total} value={money(subtotal + delivery)} bold />
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 8 }}>{t.paymentMethod}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, border: `1.5px solid ${TEAL}`, background: TEAL_TINT, borderRadius: 12, padding: 12 }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", border: `5px solid ${TEAL}` }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{t.cod}</div>
                <div style={{ fontSize: 10.5, color: MUTE }}>{t.codNote}</div>
              </div>
            </div>
          </div>

          <button onClick={handleConfirm} disabled={confirming} className="press" style={{ ...primaryBtn, background: ORANGE }}>
            {confirming ? t.placingOrder : t.confirmOrder}
          </button>
        </div>
      )}
    </div>
  );
}

const inputStyle = { width: "100%", padding: "11px 13px", borderRadius: 10, border: "1.5px solid #E5E8E7", fontSize: 13.5, outline: "none", marginBottom: 12 };
const primaryBtn = { width: "100%", padding: "13px 0", borderRadius: 12, border: "none", background: TEAL, color: "#fff", fontWeight: 700, fontSize: 13.5 };
function Field({ label, children, style }) {
  return <div style={{ marginBottom: 4, ...style }}><div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: "#454F5B" }}>{label}</div>{children}</div>;
}

/* ---------------- Orders ---------------- */
const STATUS_FLOW = ["pending", "confirmed", "processing", "shipped", "delivered"];
function statusLabel(t, s) { return { pending: t.statusPending, confirmed: t.statusConfirmed, processing: t.statusProcessing, shipped: t.statusShipped, delivered: t.statusDelivered, cancelled: t.statusCancelled }[s]; }
function statusColor(s) { return { pending: "#D97706", confirmed: TEAL, processing: "#2563EB", shipped: "#7C3AED", delivered: "#16A34A", cancelled: "#DC2626" }[s] || MUTE; }

function OrdersPage({ t, lang, orders, setOrders, onBack, onShop }) {
  const [openId, setOpenId] = useState(null);
  function cancelOrder(id) {
    setOrders((os) => os.map((o) => (o.id === id ? { ...o, status: "cancelled" } : o)));
  }
  return (
    <div style={{ padding: "16px 14px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <button onClick={onBack} style={{ border: "none", background: "none" }}><ArrowLeft size={19} /></button>
        <h2 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>{t.myOrders}</h2>
      </div>
      {orders.length === 0 ? (
        <EmptyState icon={<Package size={38} color="#C9CDCB" />} title={t.noOrders} sub={t.noOrdersSub}
          action={<button onClick={onShop} className="press" style={{ ...primaryBtn, width: "auto", padding: "10px 22px", marginTop: 16 }}>{t.home}</button>} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {orders.map((o) => {
            const open = openId === o.id;
            const idx = STATUS_FLOW.indexOf(o.status);
            return (
              <div key={o.id} style={{ background: "#fff", border: "1px solid #F0F2F1", borderRadius: 14, padding: 14 }}>
                <div onClick={() => setOpenId(open ? null : o.id)} style={{ display: "flex", justifyContent: "space-between", cursor: "pointer" }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 13.5 }}>#{o.id}</div>
                    <div style={{ fontSize: 11, color: MUTE, marginTop: 2 }}>{o.date.toLocaleDateString()} · {money(o.total)}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: statusColor(o.status), background: statusColor(o.status) + "18", padding: "4px 10px", borderRadius: 999, height: "fit-content" }}>
                    {statusLabel(t, o.status)}
                  </span>
                </div>
                {open && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #F1F3F2" }}>
                    {o.status !== "cancelled" && (
                      <div style={{ display: "flex", marginBottom: 16 }}>
                        {STATUS_FLOW.map((s, i) => (
                          <div key={s} style={{ flex: 1, textAlign: "center", position: "relative" }}>
                            <div style={{ width: 20, height: 20, borderRadius: "50%", margin: "0 auto 4px", display: "flex", alignItems: "center", justifyContent: "center", background: i <= idx ? TEAL : "#EDEFEE", color: i <= idx ? "#fff" : "#AAB0AE" }}>
                              {i <= idx ? <Check size={11} /> : <span style={{ fontSize: 9 }}>{i + 1}</span>}
                            </div>
                            <div style={{ fontSize: 8.5, color: i <= idx ? INK : "#AAB0AE", fontWeight: 600 }}>{statusLabel(t, s)}</div>
                            {i < STATUS_FLOW.length - 1 && <div style={{ position: "absolute", top: 10, left: "60%", right: "-40%", height: 2, background: i < idx ? TEAL : "#EDEFEE" }} />}
                          </div>
                        ))}
                      </div>
                    )}
                    {o.items.map((item, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "3px 0", color: "#454F5B" }}>
                        <span>{lang === "en" ? item.nameEn : item.nameBn} × {item.qty} ({item.size})</span>
                        <span style={{ fontWeight: 700 }}>{money(item.price * item.qty)}</span>
                      </div>
                    ))}
                    <div style={{ fontSize: 11.5, color: MUTE, marginTop: 8, display: "flex", gap: 5, alignItems: "flex-start" }}>
                      <MapPin size={13} style={{ marginTop: 1, flexShrink: 0 }} />
                      <span>{o.address.address}, {o.address.area}, {o.address.city}{o.address.landmark ? `, ${o.address.landmark}` : ""}</span>
                    </div>
                    {(o.status === "pending" || o.status === "confirmed") && (
                      <button onClick={() => cancelOrder(o.id)} className="press" style={{ width: "100%", marginTop: 12, padding: "9px 0", borderRadius: 10, border: "1.5px solid #F3C6C6", background: "#FEF4F4", color: "#DC2626", fontWeight: 700, fontSize: 12 }}>
                        {t.cancelOrder}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------------- Account ---------------- */
function AccountPage({ t, lang, customer, setCustomer, orders, onGoOrders }) {
  return (
    <div style={{ padding: "16px 14px 24px" }}>
      <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 16 }}>{t.myAccount}</h2>
      {customer ? (
        <div style={{ background: "#fff", border: "1px solid #F0F2F1", borderRadius: 14, padding: 16, marginBottom: 16, display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ width: 46, height: 46, borderRadius: "50%", background: TEAL_TINT, display: "flex", alignItems: "center", justifyContent: "center", color: TEAL_DARK, fontWeight: 800, fontSize: 17 }}>
            {customer.name[0]?.toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14.5 }}>{customer.name}</div>
            <div style={{ fontSize: 12, color: MUTE }}>{customer.mobile}</div>
          </div>
        </div>
      ) : (
        <div style={{ background: ORANGE_TINT, border: "1px solid #F7DAB8", borderRadius: 14, padding: 16, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 4 }}>{t.notLoggedIn}</div>
          <div style={{ fontSize: 12, color: "#8A5A1E" }}>{t.notLoggedInSub}</div>
        </div>
      )}

      <MenuRow icon={<Package size={17} color={TEAL} />} label={`${t.myOrders} (${orders.length})`} onClick={onGoOrders} />
      <MenuRow icon={<MessageCircle size={17} color={TEAL} />} label={t.whatsapp} onClick={() => window.open("https://wa.me/8801856191004", "_blank")} />
      <MenuRow icon={<Phone size={17} color={TEAL} />} label={t.callUs} onClick={() => { window.location.href = "tel:+8801856191004"; }} />
      {customer && (
        <MenuRow icon={<X size={17} color="#DC2626" />} label={t.logout} onClick={() => setCustomer(null)} danger />
      )}
    </div>
  );
}

function MenuRow({ icon, label, onClick, danger }) {
  return (
    <button onClick={onClick} className="press" style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "13px 14px", background: "#fff", border: "1px solid #F0F2F1", borderRadius: 12, marginBottom: 8, fontSize: 13, fontWeight: 600, color: danger ? "#DC2626" : INK }}>
    {icon} {label} <ChevronRight size={15} color="#C9CDCB" style={{ marginLeft: "auto" }} />
  </button>
  );
}

/* ---------------- Bottom Nav ---------------- */
function BottomNav({ t, view, setView, cartCount }) {
  const items = [
    { id: "home", icon: Home, label: t.home },
    { id: "categories", icon: Grid3x3, label: t.categories },
    { id: "orders", icon: Package, label: t.orders },
    { id: "cart", icon: ShoppingCart, label: t.cart, badge: cartCount },
    { id: "account", icon: User, label: t.account },
  ];
  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: "1px solid #EEF1F0", display: "flex", maxWidth: 480, margin: "0 auto", zIndex: 60 }}>
      {items.map((it) => {
        const active = view === it.id || (it.id === "categories" && view === "home");
        const Icon = it.icon;
        return (
          <button key={it.id} onClick={() => setView(it.id === "categories" ? "home" : it.id)} className="press"
            style={{ flex: 1, border: "none", background: "none", padding: "9px 0 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, position: "relative", color: active ? TEAL : "#9AA1A0" }}>
            <Icon size={19} strokeWidth={active ? 2.4 : 2} />
            {!!it.badge && <span style={{ position: "absolute", top: 4, right: "28%", background: ORANGE, color: "#fff", fontSize: 9, fontWeight: 700, minWidth: 14, height: 14, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center" }}>{it.badge > 9 ? "9+" : it.badge}</span>}
            <span style={{ fontSize: 9.5, fontWeight: active ? 700 : 500 }}>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* =================== ADMIN =================== */
function AdminApp({ t, lang, setLang, products, setProducts, orders, setOrders, onExit, showToast }) {
  const [loggedIn, setLoggedIn] = useState(false);
  const [tab, setTab] = useState("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobile, setMobile] = useState(""); const [pass, setPass] = useState("");

  if (!loggedIn) {
    return (
      <div style={{ minHeight: "100vh", background: `linear-gradient(180deg, ${TEAL} 0%, ${TEAL} 220px, #FBFCFC 220px)` }}>
        <div style={{ padding: "18px 16px", display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={onExit} style={{ border: "none", background: "rgba(255,255,255,0.15)", borderRadius: 999, padding: 7, color: "#fff", display: "flex" }}><ArrowLeft size={16} /></button>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>{lang === "en" ? "Back to shop" : "শপে ফিরুন"}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: 6 }}><LogoMark size={68} /></div>
        </div>
        <div style={{ padding: "0 20px" }}>
          <div style={{ maxWidth: 340, margin: "20px auto 0", background: "#fff", border: "1px solid #F0F2F1", borderRadius: 18, padding: 26, boxShadow: "0 10px 30px rgba(10,27,56,0.08)" }}>
            <h2 style={{ textAlign: "center", fontSize: 17, fontWeight: 800, marginBottom: 4, color: TEAL_DARK }}>{t.adminLogin}</h2>
            <p style={{ textAlign: "center", fontSize: 11.5, color: MUTE, marginBottom: 18 }}>{lang === "en" ? "J H Online SHOP — Seller Panel" : "জে এইচ অনলাইন শপ — সেলার প্যানেল"}</p>
            <Field label={t.mobileNumber}><input value={mobile} onChange={(e) => setMobile(e.target.value)} style={inputStyle} placeholder={t.mobilePh} /></Field>
            <Field label={t.adminPass}><input type="password" value={pass} onChange={(e) => setPass(e.target.value)} style={inputStyle} placeholder="••••••••" /></Field>
            <button onClick={() => setLoggedIn(true)} className="press" style={{ ...primaryBtn, background: `linear-gradient(90deg, ${ORANGE}, ${GOLD_LIGHT})`, color: TEAL_DARK }}>{t.login}</button>
            <div style={{ fontSize: 10.5, color: "#C9CDCB", textAlign: "center", marginTop: 14 }}>{lang === "en" ? "Demo: any mobile number/password works" : "ডেমো: যেকোনো মোবাইল নম্বর/পাসওয়ার্ড কাজ করবে"}</div>
          </div>
        </div>
      </div>
    );
  }

  const outOfStock = products.filter((p) => Object.values(p.stock).reduce((a, b) => a + b, 0) === 0).length;
  const totalSales = orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0);
  const pending = orders.filter((o) => o.status === "pending").length;
  const uniqueCustomers = new Set(orders.map((o) => o.customer?.mobile)).size;

  const menuItems = [
    { id: "dashboard", icon: Home, label: lang === "en" ? "Home" : "হোম" },
    { id: "profile", icon: User, label: lang === "en" ? "Profile" : "প্রোফাইল" },
    { id: "add", icon: Plus, label: lang === "en" ? "Add New Product" : "নতুন পণ্য" },
    { id: "products", icon: Boxes, label: lang === "en" ? "All Products" : "সকল পণ্য" },
    { id: "orders", icon: Package, label: lang === "en" ? "Order List" : "অর্ডার লিস্ট" },
    { id: "active", icon: Truck, label: lang === "en" ? "Active Orders" : "অ্যাক্টিভ অর্ডার" },
    { id: "sales", icon: TrendingUp, label: lang === "en" ? "Sales & Profit" : "সেলস & প্রফিট" },
    { id: "balance", icon: Boxes, label: lang === "en" ? "Balance Statement" : "ব্যালেন্স স্টেটমেন্ট" },
    { id: "customers", icon: Users2, label: lang === "en" ? "Customers" : "কাস্টমার" },
    { id: "payment", icon: LayoutDashboard, label: lang === "en" ? "Payment Settings" : "পেমেন্ট সেটিংস" },
    { id: "support", icon: MessageCircle, label: lang === "en" ? "Support" : "সাপোর্ট" },
  ];

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", position: "relative" }}>
      <div style={{ background: TEAL, padding: "13px 14px", display: "flex", alignItems: "center", gap: 10, position: "sticky", top: 0, zIndex: 30 }}>
        <button onClick={() => setMenuOpen(true)} style={{ border: "none", background: "rgba(255,255,255,0.14)", borderRadius: 9, padding: 7, display: "flex", color: "#fff" }}>
          <Menu size={17} />
        </button>
        <LogoMark size={28} />
        <div style={{ fontWeight: 800, fontSize: 13.5, color: "#fff" }}>{t.admin}</div>
        <div style={{ flex: 1 }} />
        <button onClick={() => setLang(lang === "en" ? "bn" : "en")} style={{ border: "1px solid rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.1)", color: "#fff", borderRadius: 999, padding: "5px 10px", fontSize: 11, fontWeight: 700 }}>{lang === "en" ? "বাংলা" : "EN"}</button>
      </div>

      {menuOpen && (
        <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(10,27,56,0.35)", zIndex: 90 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 250, height: "100%", background: "#fff", boxShadow: "4px 0 24px rgba(0,0,0,0.15)", overflowY: "auto" }}>
            <div style={{ background: TEAL, padding: "16px 16px 20px", display: "flex", alignItems: "center", gap: 10 }}>
              <LogoMark size={38} />
              <div>
                <div style={{ color: "#fff", fontWeight: 800, fontSize: 13 }}>{lang === "en" ? "J H Online SHOP" : "জে এইচ অনলাইন শপ"}</div>
                <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 10 }}>{lang === "en" ? "Seller Panel" : "সেলার প্যানেল"}</div>
              </div>
              <button onClick={() => setMenuOpen(false)} style={{ marginLeft: "auto", border: "none", background: "rgba(255,255,255,0.15)", borderRadius: 8, padding: 5, color: "#fff" }}><X size={15} /></button>
            </div>
            <div style={{ padding: "6px 0" }}>
              {menuItems.map((mi) => {
                const active = tab === mi.id;
                const Icon = mi.icon;
                return (
                  <button key={mi.id} onClick={() => { setTab(mi.id); setMenuOpen(false); }} className="press"
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", border: "none", borderBottom: "1px solid #F5F6F5", background: active ? ORANGE_TINT : "#fff", color: active ? TEAL_DARK : "#454F5B", fontSize: 12.5, fontWeight: active ? 800 : 600 }}>
                    <Icon size={16} color={active ? ORANGE : "#9AA1A0"} /> {mi.label}
                  </button>
                );
              })}
              <button onClick={onExit} className="press" style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", border: "none", background: "#FEF4F4", color: "#DC2626", fontSize: 12.5, fontWeight: 700, marginTop: 6 }}>
                <X size={16} /> {t.exitAdmin}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: 14, flex: 1 }}>
        {tab === "dashboard" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10, marginBottom: 16 }}>
              <StatCard icon={<Boxes size={16} color={TEAL} />} label={t.totalProducts} value={products.length} />
              <StatCard icon={<XCircle size={16} color="#DC2626" />} label={t.outOfStockCount} value={outOfStock} />
              <StatCard icon={<Package size={16} color="#2563EB" />} label={t.totalOrders} value={orders.length} />
              <StatCard icon={<Clock size={16} color="#D97706" />} label={t.pendingOrders} value={pending} />
              <StatCard icon={<TrendingUp size={16} color={ORANGE} />} label={t.totalSales} value={money(totalSales)} />
              <StatCard icon={<Users2 size={16} color="#7C3AED" />} label={t.totalCustomers} value={uniqueCustomers} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>{lang === "en" ? "Recent Orders" : "সাম্প্রতিক অর্ডার"}</div>
            {orders.slice(0, 5).map((o) => (
              <div key={o.id} style={{ display: "flex", justifyContent: "space-between", background: "#fff", border: "1px solid #F0F2F1", borderRadius: 10, padding: "10px 12px", marginBottom: 6, fontSize: 12 }}>
                <span style={{ fontWeight: 700 }}>#{o.id}</span>
                <span style={{ color: MUTE }}>{o.customer?.name}</span>
                <span style={{ fontWeight: 700, color: statusColor(o.status) }}>{statusLabel(t, o.status)}</span>
              </div>
            ))}
            {orders.length === 0 && <div style={{ color: MUTE, fontSize: 12.5 }}>{lang === "en" ? "No orders yet." : "এখনো অর্ডার নেই।"}</div>}
          </div>
        )}

        {tab === "add" && <AddProductForm t={t} lang={lang} setProducts={setProducts} showToast={showToast} setTab={setTab} />}

        {tab === "products" && (
          <div>
            {products.length === 0 && <div style={{ color: MUTE, fontSize: 12.5 }}>{t.noProductsYet}</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {products.map((p) => {
                const stock = Object.values(p.stock).reduce((a, b) => a + b, 0);
                return (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", border: "1px solid #F0F2F1", borderRadius: 12, padding: 10 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 9, background: GRADIENTS[p.nameEn.length % GRADIENTS.length], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{p.emoji}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lang === "en" ? p.nameEn : p.nameBn}</div>
                      <div style={{ fontSize: 10.5, color: MUTE }}>{money(p.price)} · {stock === 0 ? t.outOfStock : `${stock} ${lang === "en" ? "in stock" : "স্টকে"}`}</div>
                    </div>
                    <button onClick={() => setProducts((ps) => ps.filter((x) => x.id !== p.id))} style={{ border: "none", background: "none", color: "#DC2626" }}><Trash2 size={16} /></button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {(tab === "orders" || tab === "active") && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(tab === "active" ? orders.filter((o) => !["delivered", "cancelled"].includes(o.status)) : orders).length === 0 && (
              <div style={{ color: MUTE, fontSize: 12.5 }}>{lang === "en" ? "No orders yet." : "এখনো অর্ডার নেই।"}</div>
            )}
            {(tab === "active" ? orders.filter((o) => !["delivered", "cancelled"].includes(o.status)) : orders).map((o) => (
              <div key={o.id} style={{ background: "#fff", border: "1px solid #F0F2F1", borderRadius: 12, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontWeight: 800, fontSize: 13 }}>#{o.id}</span>
                  <span style={{ fontWeight: 700, fontSize: 13, color: TEAL_DARK }}>{money(o.total)}</span>
                </div>
                <div style={{ fontSize: 11.5, color: MUTE, marginBottom: 8 }}>{o.customer?.name} · {o.customer?.mobile}</div>
                <select value={o.status} onChange={(e) => setOrders((os) => os.map((x) => x.id === o.id ? { ...x, status: e.target.value } : x))}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1.5px solid #E5E8E7", fontSize: 12, fontWeight: 600, color: statusColor(o.status) }}>
                  {[...STATUS_FLOW, "cancelled"].map((s) => <option key={s} value={s}>{statusLabel(t, s)}</option>)}
                </select>
              </div>
            ))}
          </div>
        )}

        {tab === "profile" && (
          <div style={{ background: "#fff", border: "1px solid #F0F2F1", borderRadius: 14, padding: 18, textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}><LogoMark size={60} /></div>
            <div style={{ fontWeight: 800, fontSize: 14 }}>{lang === "en" ? "J H Online SHOP — Admin" : "জে এইচ অনলাইন শপ — অ্যাডমিন"}</div>
            <div style={{ fontSize: 11.5, color: MUTE, marginTop: 4 }}>{lang === "en" ? "Store profile settings would appear here." : "স্টোর প্রোফাইল সেটিংস এখানে দেখা যাবে।"}</div>
          </div>
        )}

        {tab === "sales" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10, marginBottom: 16 }}>
              <StatCard icon={<TrendingUp size={16} color={ORANGE} />} label={t.totalSales} value={money(totalSales)} />
              <StatCard icon={<Clock size={16} color="#D97706" />} label={t.todaySales} value={money(orders.filter(o => o.status !== 'cancelled' && new Date(o.date).toDateString() === new Date().toDateString()).reduce((s, o) => s + o.total, 0))} />
            </div>
            <div style={{ color: MUTE, fontSize: 12, background: "#fff", border: "1px solid #F0F2F1", borderRadius: 12, padding: 14 }}>
              {lang === "en" ? "Detailed sales charts and profit breakdowns would appear here once connected to a real database." : "সত্যিকারের ডেটাবেসের সাথে সংযুক্ত হলে বিস্তারিত সেলস চার্ট ও প্রফিট বিভাজন এখানে দেখা যাবে।"}
            </div>
          </div>
        )}

        {tab === "balance" && (
          <div style={{ background: "#fff", border: "1px solid #F0F2F1", borderRadius: 14, padding: 16 }}>
            <Row label={t.totalSales} value={money(totalSales)} bold />
            <Row label={lang === "en" ? "Delivery charges collected" : "সংগৃহীত ডেলিভারি চার্জ"} value={money(orders.filter(o=>o.status!=='cancelled').reduce((s,o)=>s+o.delivery,0))} />
            <Row label={lang === "en" ? "Cancelled order value" : "বাতিল অর্ডারের মূল্য"} value={money(orders.filter(o=>o.status==='cancelled').reduce((s,o)=>s+o.total,0))} />
          </div>
        )}

        {tab === "customers" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[...new Map(orders.map((o) => [o.customer?.mobile, o])).values()].length === 0 && (
              <div style={{ color: MUTE, fontSize: 12.5 }}>{lang === "en" ? "No customers yet." : "এখনো কোনো কাস্টমার নেই।"}</div>
            )}
            {[...new Map(orders.map((o) => [o.customer?.mobile, o])).values()].map((o) => {
              const custOrders = orders.filter((x) => x.customer?.mobile === o.customer?.mobile);
              const total = custOrders.reduce((s, x) => s + (x.status !== "cancelled" ? x.total : 0), 0);
              return (
                <div key={o.customer?.mobile} style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", border: "1px solid #F0F2F1", borderRadius: 12, padding: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: TEAL_TINT, color: TEAL_DARK, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, flexShrink: 0 }}>{o.customer?.name?.[0]?.toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700 }}>{o.customer?.name}</div>
                    <div style={{ fontSize: 10.5, color: MUTE }}>{o.customer?.mobile} · {custOrders.length} {lang === "en" ? "orders" : "অর্ডার"}</div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 12.5, color: TEAL_DARK }}>{money(total)}</div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "payment" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[{ name: t.cod, active: true }, { name: "bKash", active: false }, { name: "Nagad", active: false }, { name: "Rocket", active: false }, { name: lang === "en" ? "Card" : "কার্ড", active: false }].map((p) => (
              <div key={p.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", border: "1px solid #F0F2F1", borderRadius: 12, padding: "12px 14px" }}>
                <span style={{ fontSize: 12.5, fontWeight: 700 }}>{p.name}</span>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: p.active ? "#16A34A" : MUTE, background: p.active ? "#EAFBF0" : "#F5F6F5", padding: "3px 9px", borderRadius: 999 }}>
                  {p.active ? (lang === "en" ? "Active" : "সক্রিয়") : (lang === "en" ? "Coming soon" : "শীঘ্রই আসছে")}
                </span>
              </div>
            ))}
          </div>
        )}

        {tab === "support" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <MenuRow icon={<MessageCircle size={17} color={ORANGE} />} label={t.whatsapp} onClick={() => window.open("https://wa.me/8801856191004", "_blank")} />
            <MenuRow icon={<Phone size={17} color={ORANGE} />} label={t.callUs} onClick={() => { window.location.href = "tel:+8801856191004"; }} />
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #F0F2F1", borderRadius: 12, padding: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>{icon}<span style={{ fontSize: 10.5, color: MUTE, fontWeight: 600 }}>{label}</span></div>
      <div style={{ fontSize: 18, fontWeight: 800 }}>{value}</div>
    </div>
  );
}

function AddProductForm({ t, lang, setProducts, showToast, setTab }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [cat, setCat] = useState("women");
  const [sizes, setSizes] = useState("");
  const [oldPrice, setOldPrice] = useState("");
  const [price, setPrice] = useState("");
  const [stockQty, setStockQty] = useState("");
  const [emoji, setEmoji] = useState("🛍️");
  const [image, setImage] = useState("");
  const fileRef = useRef(null);

  const discount = oldPrice && price ? pct(Number(oldPrice), Number(price)) : 0;

  function publish() {
    if (!name.trim() || !price || !sizes.trim()) { showToast(lang === "en" ? "Fill required fields" : "প্রয়োজনীয় ঘরগুলো পূরণ করুন"); return; }
    const sizeList = sizes.split(",").map((s) => s.trim()).filter(Boolean);
    const stockPerSize = {};
    sizeList.forEach((s) => (stockPerSize[s] = Number(stockQty) || 10));
    const isBn = /[\u0980-\u09FF]/.test(name);
    const newProduct = {
      id: uid(), cat, emoji, image,
      nameEn: isBn ? name + " (auto-translated)" : name,
      nameBn: isBn ? name : name + " (স্বয়ংক্রিয় অনুবাদ)",
      descEn: isBn ? (desc || "Quality product from J H Online SHOP.") : (desc || "Quality product from J H Online SHOP."),
      descBn: desc || "জে এইচ অনলাইন শপের মানসম্মত পণ্য।",
      oldPrice: Number(oldPrice) || Number(price), price: Number(price), sizes: sizeList, colors: [],
      sku: "JH-" + uid().toUpperCase().slice(0, 6), stock: stockPerSize, rating: 0, reviews: 0, tags: [],
    };
    setProducts((ps) => [newProduct, ...ps]);
    showToast(t.published);
    setName(""); setDesc(""); setSizes(""); setOldPrice(""); setPrice(""); setStockQty(""); setImage(""); if (fileRef.current) fileRef.current.value = "";
    setTab("products");
  }

  return (
    <div>
      <div onClick={() => fileRef.current?.click()}
        className="press" style={{ height: 150, borderRadius: 14, border: "2px dashed #D6DBD9", background: TEAL_TINT, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 16, cursor: "pointer", overflow: "hidden" }}>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          if (file.size > 4 * 1024 * 1024) { showToast(lang === "en" ? "Image must be under 4MB" : "ছবির সাইজ ৪MB-এর কম হতে হবে"); return; }
          const reader = new FileReader();
          reader.onload = () => {
            const src = String(reader.result || "");
            const img = new Image();
            img.onload = () => {
              const max = 1000;
              const scale = Math.min(1, max / Math.max(img.width, img.height));
              const canvas = document.createElement("canvas");
              canvas.width = Math.max(1, Math.round(img.width * scale));
              canvas.height = Math.max(1, Math.round(img.height * scale));
              const ctx = canvas.getContext("2d");
              if (!ctx) { setImage(src); return; }
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              setImage(canvas.toDataURL("image/jpeg", 0.78));
            };
            img.onerror = () => setImage(src);
            img.src = src;
          };
          reader.readAsDataURL(file);
        }} />
        {image ? <img src={image} alt="Product preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <>
          <span style={{ fontSize: 34 }}>{emoji}</span>
          <div style={{ fontSize: 11.5, color: TEAL_DARK, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}><Upload size={13} /> {t.uploadImage}</div>
        </>}
      </div>

      <Field label={t.productName}><input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.productNamePh} style={inputStyle} /></Field>
      {name && (
        <div style={{ fontSize: 11, color: MUTE, marginTop: -8, marginBottom: 12, background: "#F6F8F7", padding: "8px 10px", borderRadius: 8 }}>
          {t.autoTranslate}: <strong>{/[\u0980-\u09FF]/.test(name) ? name + " (EN translation would appear here)" : name + " (বাংলা অনুবাদ এখানে আসবে)"}</strong>
        </div>
      )}
      <Field label={t.description}><textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} /></Field>
      <Field label={t.category}>
        <select value={cat} onChange={(e) => setCat(e.target.value)} style={inputStyle}>
          {CATS.filter((c) => c.id !== "all").map((c) => <option key={c.id} value={c.id}>{lang === "en" ? c.en : c.bn}</option>)}
        </select>
      </Field>
      <Field label={t.sizesAvail}><input value={sizes} onChange={(e) => setSizes(e.target.value)} placeholder={t.sizesPh} style={inputStyle} /></Field>
      <div style={{ display: "flex", gap: 10 }}>
        <Field label={t.oldPrice} style={{ flex: 1 }}><input type="number" value={oldPrice} onChange={(e) => setOldPrice(e.target.value)} style={inputStyle} /></Field>
        <Field label={t.currentPrice} style={{ flex: 1 }}><input type="number" value={price} onChange={(e) => setPrice(e.target.value)} style={inputStyle} /></Field>
      </div>
      {discount > 0 && <div style={{ fontSize: 11.5, color: ORANGE, fontWeight: 700, marginTop: -8, marginBottom: 12 }}>{t.discount}: {discount}% {t.off}</div>}
      <Field label={t.stockQty}><input type="number" value={stockQty} onChange={(e) => setStockQty(e.target.value)} placeholder="10" style={inputStyle} /></Field>

      <button onClick={publish} className="press" style={{ ...primaryBtn, background: ORANGE, marginTop: 8 }}>{t.publish}</button>
    </div>
  );
}
