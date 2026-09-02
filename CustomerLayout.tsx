import React from "react";
import { Outlet } from "react-router-dom";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";

export default function CustomerLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FBFCFC]">
      <Header />
      <main className="flex-1 pb-20">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
