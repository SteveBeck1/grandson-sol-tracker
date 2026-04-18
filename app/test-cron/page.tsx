"use client";

import { useState } from "react";

export default function TestCronPage() {
  const [result, setResult] = useState("");

  async function runManualWeeklyBuy() {
    try {
      const res = await fetch("/api/contributions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: new Date().toISOString().slice(0, 10),
          aud_amount: 50,
          sol_price_aud: 123.45,
          notes: "Weekly auto buy",
        }),
      });

      const data = await res.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (err) {
      setResult("Manual save failed");
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-3xl rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Test Weekly Buy</h1>
        <p className="mt-2 text-sm text-gray-600">
          This is only for manual testing.
        </p>

        <button
          onClick={runManualWeeklyBuy}
          className="mt-4 rounded-lg bg-black px-5 py-3 text-white"
        >
          Save Test Weekly Buy
        </button>

        <pre className="mt-6 overflow-x-auto rounded-lg border bg-gray-50 p-4 text-sm">
          {result}
        </pre>
      </div>
    </main>
  );
}