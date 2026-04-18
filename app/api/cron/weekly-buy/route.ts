import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    // 1. Get latest SOL price
    const priceRes = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=aud");
    const priceData = await priceRes.json();

    const price = priceData?.solana?.aud;

    if (!price) {
      throw new Error("Failed to fetch SOL price");
    }

    // 2. Weekly amount (you can later make this dynamic)
    const weeklyAmount = 50;

    const solBought = weeklyAmount / price;

    const today = new Date().toISOString().slice(0, 10);

    // 3. Insert into Supabase
    const { error } = await supabase.from("contributions").insert([
      {
        date: today,
        aud_amount: weeklyAmount,
        sol_price_aud: price,
        sol_bought: solBought,
        notes: "Auto weekly buy",
      },
    ]);

    if (error) {
      throw error;
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Cron failed" }, { status: 500 });
  }
}