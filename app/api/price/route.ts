import { NextResponse } from "next/server";
import { getSolPriceAud } from "@/app/lib/coingecko";

export async function GET() {
  try {
    const price = await getSolPriceAud();

    return NextResponse.json({
      symbol: "SOL",
      currency: "AUD",
      price,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Could not fetch SOL price" },
      { status: 500 }
    );
  }
}