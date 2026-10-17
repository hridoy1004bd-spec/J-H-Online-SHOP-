import React from "react";
import demoHtml from "../telecom/telecom-demo.html?raw";

// ডেমো: ডেটা শুধু ব্রাউজারের মেমোরিতে থাকে, ডাটাবেসে কিছু যায় না।
const html = demoHtml.replace("<body>", "<body><script>window.__ROLE='a'</script>");

export default function AdminTelecom() {
  return (
    <iframe
      title="J H Telecom Reseller Admin"
      srcDoc={html}
      className="w-full border-0 block rounded-xl"
      style={{ height: "calc(100dvh - 90px)" }}
    />
  );
}
