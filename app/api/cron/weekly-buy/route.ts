import { NextResponse } from "next/server";

export async function GET() {
  try {
    // 🌏 Get Melbourne time
    const now = new Date();

    const melbTime = new Date(
      now.toLocaleString("en-US", { timeZone: "Australia/Melbourne" })
    );

    const day = melbTime.getDay(); // 1 = Monday
    const hour = melbTime.getHours();

    console.log("Cron check (Melbourne):", melbTime);

    // ✅ Only run Monday at 12:00
    if (day !== 1 || hour !== 12) {
      return NextResponse.json({
        skipped: true,
        reason: "Not correct time",
        melbTime,
      });
    }

    // 📅 Get start of this week (Monday)
    const startOfWeek = new Date(melbTime);
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(melbTime.getDate() - melbTime.getDay() + 1);

    // 🔗 Check existing contributions
    const existingRes = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/contributions?date=gte.${startOfWeek.toISOString().slice(0, 10)}`,
      {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
      }
    );

    const existing = await existingRes.json();

    if (Array.isArray(existing) && existing.length > 0) {
      return NextResponse.json({
        skipped: true,
        reason: "Weekly buy already exists",
      });
    }

    // 💰 Fetch live price
    const priceRes = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=aud"
    );
    const priceData = await priceRes.json();

    const price = priceData.solana.aud;

    const weeklyAmount = 50; // you can make this dynamic later
    const solBought = weeklyAmount / price;

    // 💾 Save contribution
    const insertRes = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/contributions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          date: melbTime.toISOString().slice(0, 10),
          aud_amount: weeklyAmount,
          sol_price_aud: price,
          sol_bought: solBought,
          notes: "Auto weekly buy",
        }),
      }
    );

    if (!insertRes.ok) {
      const err = await insertRes.text();
      throw new Error(err);
    }

    return NextResponse.json({
      success: true,
      price,
      solBought,
    });
  } catch (err: any) {
    console.error("Cron error:", err);

    return NextResponse.json(
      {
        error: err.message,
      },
      { status: 500 }
    );
  }
}