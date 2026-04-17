"use client";

import { useState } from "react";

export default function TestSavePage() {
  const [result, setResult] = useState("");

  async function saveContribution() {
    try {
      const res = await fetch("/api/contributions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: "2026-04-17",
          aud_amount: 650,
          sol_price_aud: 122.19,
          notes: "Initial buy",
        }),
      });

      const data = await res.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setResult("Save failed");
      console.error(error);
    }
  }

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-bold">Test Save Contribution</h1>

      <button
        onClick={saveContribution}
        className="mt-4 rounded bg-black px-4 py-2 text-white"
      >
        Save test contribution
      </button>

      <pre className="mt-6 whitespace-pre-wrap rounded border p-4">
        {result}
      </pre>
    </main>
  );
}