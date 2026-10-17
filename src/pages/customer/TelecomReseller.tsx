import React from "react";
import demoHtml from "../telecom/telecom-demo.html?raw";

// ডেমো: ডেটা শুধু ব্রাউজারের মেমোরিতে থাকে, ডাটাবেসে কিছু যায় না।
const html = demoHtml.replace("<body>", "<body><script>window.__ROLE='r'</script>");

export default function TelecomReseller() {
  return (
    <iframe
      title="J H Telecom Reseller"
      srcDoc={html}
      className="w-full border-0 block"
      style={{ height: "calc(100dvh - 140px)" }}
    />
  );
}
