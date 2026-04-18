import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const expected = `Bearer ${process.env.CRON_SECRET}`;

    if (!process.env.CRON_SECRET) {
      return NextResponse.json(
        { error: "CRON_SECRET is missing" },
        { status: 500 }
      );
    }

    if (authHeader !== expected) {
      return NextResponse.json(
        { error: "Unauthorized cron request" },
        { status: 401 }
      );
    }

    const buyAmount = Number(process.env.WEEKLY_BUY_AMOUNT || "50");
    const today = new Date().toISOString().slice(0, 10);

    const existing = await supabase
      .from("contributions")
      .select("id")
      .eq("date", today)
      .eq("notes", "Weekly auto buy")
      .limit(1);

    if (existing.error) {
      return NextResponse.json(
        { error: existing.error.message },
        { status: 500 }
      );
    }

    if (existing.data && existing.data.length > 0) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        message: "Weekly auto buy already exists for today",
      });
    }

    const priceRes = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=aud",
      {
        headers: {
          accept: "application/json",
        },
        cache: "no-store",
      }
    );

    if (!priceRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch live SOL price" },
        { status: 500 }
      );
    }

    const priceJson = await priceRes.json();
    const solPriceAud = Number(priceJson?.solana?.aud);

    if (!solPriceAud || Number.isNaN(solPriceAud)) {
      return NextResponse.json(
        { error: "Invalid SOL price received" },
        { status: 500 }
      );
    }

    const solBought = buyAmount / solPriceAud;

    const insert = await supabase
      .from("contributions")
      .insert({
        date: today,
        aud_amount: buyAmount,
        sol_price_aud: solPriceAud,
        sol_bought: solBought,
        notes: "Weekly auto buy",
      })
      .select()
      .single();

    if (insert.error) {
      return NextResponse.json(
        { error: insert.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      saved: true,
      row: insert.data,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Unexpected cron failure" },
      { status: 500 }
    );
  }
}