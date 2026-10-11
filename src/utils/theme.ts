const KEY = "jh-theme";

export type ThemeMode = "light" | "dark";

export function getTheme(): ThemeMode {
  try {
    return localStorage.getItem(KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

// ডার্ক মোড শুধু কাস্টমার সাইটে কাজ করে, অ্যাডমিন পেজে নয়
export function applyTheme(pathname: string) {
  const dark = getTheme() === "dark" && !pathname.startsWith("/admin");
  document.documentElement.classList.toggle("dark", dark);
}

export function setTheme(mode: ThemeMode) {
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    /* ignore */
  }
  applyTheme(window.location.pathname);
}
