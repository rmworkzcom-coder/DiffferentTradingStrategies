import React from "react";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <main style={{ minHeight: "100vh", padding: 24, background: "#07111f", color: "#f5f7fa", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 24, marginBottom: 12 }}>Alpaca Margin &amp; Risk Terminal</h1>
      <p>Loading live account data…</p>
    </main>
  );
}
