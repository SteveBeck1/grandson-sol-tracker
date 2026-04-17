export async function getSolPriceAud() {
  const url =
    "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=aud";

  const res = await fetch(url, { cache: "no-store" });

  if (!res.ok) {
    throw new Error("Failed to fetch SOL price");
  }

  const data = await res.json();
  return data?.solana?.aud ?? 0;
}