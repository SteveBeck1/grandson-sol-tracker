import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("contributions")
    .select("*")
    .order("date", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const aud = Number(body.aud_amount);
  const price = Number(body.sol_price_aud);
  const solBought = aud / price;

  const { data, error } = await supabase
    .from("contributions")
    .insert({
      date: body.date,
      aud_amount: aud,
      sol_price_aud: price,
      sol_bought: solBought,
      notes: body.notes ?? "",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}