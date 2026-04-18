import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=aud",
      {
        headers: {
          accept: "application/json",
        },
        cache: "no-store", // always fresh
      }
    );

    const data = await res.json();

    return NextResponse.json({
      price: data.solana.aud,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch price" },
      { status: 500 }
    );
  }
}