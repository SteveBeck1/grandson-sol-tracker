export async function GET() {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/coins/solana/market_chart?vs_currency=aud&days=30",
      { cache: "no-store" }
    );

    const data = await res.json();

    const formatted = data.prices.map((item: [number, number]) => ({
      date: new Date(item[0]).toLocaleDateString("en-AU", {
        day: "2-digit",
        month: "short",
      }),
      price: Number(item[1].toFixed(2)),
    }));

    return Response.json(formatted);
  } catch (error) {
    return Response.json(
      { error: "Failed to fetch price history" },
      { status: 500 }
    );
  }
}