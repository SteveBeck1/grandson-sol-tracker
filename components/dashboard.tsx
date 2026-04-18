"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ContributionRow = {
  id: string;
  date: string;
  aud_amount: number;
  sol_price_aud: number;
  sol_bought: number;
  notes?: string | null;
  created_at?: string;
};

function fmtAud(n: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 2,
  }).format(n || 0);
}

function fmtNum(n: number, d = 3) {
  return new Intl.NumberFormat("en-AU", {
    maximumFractionDigits: d,
  }).format(n || 0);
}

function shortDate(dateStr: string) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
  });
}

export default function Dashboard() {
  const [solPrice, setSolPrice] = useState(120);

  const [walletSol, setWalletSol] = useState(0.01);
  const [stakedSol, setStakedSol] = useState(5.3);

  const [weeklyContribution, setWeeklyContribution] = useState(50);
  const [stakingRate, setStakingRate] = useState(5.63);
  const [growthRate, setGrowthRate] = useState(10);
  const [currentAge, setCurrentAge] = useState(4);
  const [targetAge, setTargetAge] = useState(20);

  const [contributions, setContributions] = useState<ContributionRow[]>([]);
  const [loadingContributions, setLoadingContributions] = useState(true);
  const [contributionsError, setContributionsError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [newAudAmount, setNewAudAmount] = useState(50);
  const [newSolPriceAud, setNewSolPriceAud] = useState(120);
  const [newNotes, setNewNotes] = useState("Weekly contribution");
  const [savingContribution, setSavingContribution] = useState(false);

  async function loadContributions() {
    try {
      setLoadingContributions(true);
      setContributionsError("");

      const res = await fetch("/api/contributions");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to load contributions");
      }

      const sorted = Array.isArray(data)
        ? [...data].sort((a, b) => a.date.localeCompare(b.date))
        : [];

      setContributions(sorted);
    } catch (err) {
      console.error("Failed to load contributions", err);
      setContributionsError("Could not load contributions");
    } finally {
      setLoadingContributions(false);
    }
  }

  async function fetchLivePrice() {
    try {
      const res = await fetch("/api/price");
      const data = await res.json();

      if (data?.price) {
        setSolPrice(Number(data.price));
      }
    } catch (err) {
      console.error("Price fetch failed", err);
    }
  }

  useEffect(() => {
    fetchLivePrice();

    const interval = setInterval(() => {
      fetchLivePrice();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setNewSolPriceAud(solPrice);
  }, [solPrice]);

  useEffect(() => {
    loadContributions();
  }, []);

  const totalInvested = useMemo(() => {
    return contributions.reduce((sum, row) => sum + Number(row.aud_amount || 0), 0);
  }, [contributions]);

  const totalSolFromBuys = useMemo(() => {
    return contributions.reduce((sum, row) => sum + Number(row.sol_bought || 0), 0);
  }, [contributions]);

  const avgBuyPrice = useMemo(() => {
    if (totalSolFromBuys <= 0) return 0;
    return totalInvested / totalSolFromBuys;
  }, [totalInvested, totalSolFromBuys]);

  const totalSolHeld = walletSol + stakedSol;
  const totalValue = totalSolHeld * solPrice;
  const gainLoss = totalValue - totalInvested;

  const projectedValue = useMemo(() => {
    const years = Math.max(targetAge - currentAge, 0);
    const weeklyStake = Math.pow(1 + stakingRate / 100, 1 / 52) - 1;
    const weeklyGrowth = Math.pow(1 + growthRate / 100, 1 / 52) - 1;

    let sol = totalSolHeld;
    let price = solPrice;

    for (let i = 0; i < years * 52; i++) {
      sol += weeklyContribution / price;
      sol *= 1 + weeklyStake;
      price *= 1 + weeklyGrowth;
    }

    return sol * price;
  }, [
    currentAge,
    targetAge,
    growthRate,
    solPrice,
    stakingRate,
    totalSolHeld,
    weeklyContribution,
  ]);

  const portfolioChartData = useMemo(() => {
    let runningInvested = 0;
    let runningSol = 0;

    return contributions.map((row) => {
      runningInvested += Number(row.aud_amount || 0);
      runningSol += Number(row.sol_bought || 0);

      return {
        date: shortDate(row.date),
        invested: Number(runningInvested.toFixed(2)),
        value: Number((runningSol * solPrice).toFixed(2)),
        sol: Number(runningSol.toFixed(4)),
      };
    });
  }, [contributions, solPrice]);

  const contributionBarData = useMemo(() => {
    return contributions.map((row) => ({
      date: shortDate(row.date),
      amount: Number(row.aud_amount || 0),
    }));
  }, [contributions]);

  async function handleAddContribution(e: React.FormEvent) {
    e.preventDefault();

    try {
      setSavingContribution(true);
      setSaveMessage("");

      const res = await fetch("/api/contributions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: newDate,
          aud_amount: Number(newAudAmount),
          sol_price_aud: Number(newSolPriceAud),
          notes: newNotes,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to save contribution");
      }

      setSaveMessage("Contribution saved successfully.");
      setNewAudAmount(50);
      setNewNotes("Weekly contribution");

      await loadContributions();
      await fetchLivePrice();
    } catch (err) {
      console.error("Failed to save contribution", err);
      setSaveMessage("Could not save contribution.");
    } finally {
      setSavingContribution(false);
    }
  }

  async function handleAutoFillWeeklyBuy() {
    try {
      setSaveMessage("Saving weekly buy...");
      setSavingContribution(true);

      const today = new Date().toISOString().slice(0, 10);

      const audAmount = weeklyContribution;
      const price = solPrice;
      const solBought = audAmount / price;

      const res = await fetch("/api/contributions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: today,
          aud_amount: audAmount,
          sol_price_aud: price,
          sol_bought: solBought,
          notes: "Weekly auto buy",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to save weekly buy");
      }

      setSaveMessage("✅ Weekly buy saved!");

      await loadContributions();
      await fetchLivePrice();
    } catch (err) {
      console.error(err);
      setSaveMessage("❌ Failed to save weekly buy");
    } finally {
      setSavingContribution(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Grandson SOL Tracker</h1>
            <p className="mt-2 text-gray-600">
              Long-term crypto investment tracker
            </p>
          </div>

          <button
            type="button"
            onClick={fetchLivePrice}
            className="rounded-lg border bg-white px-4 py-2 text-sm hover:bg-gray-50"
          >
            Refresh Live Price
          </button>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold">Wallet Settings</h2>
          <p className="mt-1 text-sm text-gray-500">
            Change these instead of editing the code every time.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Wallet SOL</label>
              <input
                type="number"
                value={walletSol}
                onChange={(e) => setWalletSol(Number(e.target.value))}
                className="w-full rounded-lg border p-3"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Staked SOL</label>
              <input
                type="number"
                value={stakedSol}
                onChange={(e) => setStakedSol(Number(e.target.value))}
                className="w-full rounded-lg border p-3"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Total SOL Held</p>
            <p className="mt-2 text-2xl font-bold">{fmtNum(totalSolHeld)}</p>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Total Value</p>
            <p className="mt-2 text-2xl font-bold">{fmtAud(totalValue)}</p>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Total Invested</p>
            <p className="mt-2 text-2xl font-bold">{fmtAud(totalInvested)}</p>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Projected @ Age {targetAge}</p>
            <p className="mt-2 text-2xl font-bold">{fmtAud(projectedValue)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">SOL Price (AUD)</p>
            <p className="mt-2 text-2xl font-bold">{fmtAud(solPrice)}</p>
            <p className="mt-1 text-xs text-gray-500">Live from API</p>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Total SOL From Buys</p>
            <p className="mt-2 text-2xl font-bold">{fmtNum(totalSolFromBuys, 4)}</p>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Avg Buy Price</p>
            <p className="mt-2 text-2xl font-bold">{fmtAud(avgBuyPrice)}</p>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Gain / Loss</p>
            <p
              className={`mt-2 text-2xl font-bold ${
                gainLoss >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {fmtAud(gainLoss)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold">Portfolio Growth</h2>
            <p className="mt-1 text-sm text-gray-500">
              Invested amount vs current value of accumulated SOL.
            </p>

            <div className="mt-5 h-80 w-full">
              {portfolioChartData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-gray-500">
                  Add contributions to see the chart.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={portfolioChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="invested"
                      stroke="#2563eb"
                      strokeWidth={3}
                      dot={false}
                      name="Invested"
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#16a34a"
                      strokeWidth={3}
                      dot={false}
                      name="Current Value"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold">Contribution Amounts</h2>
            <p className="mt-1 text-sm text-gray-500">
              A quick visual of each contribution saved so far.
            </p>

            <div className="mt-5 h-80 w-full">
              {contributionBarData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-gray-500">
                  Add contributions to see the chart.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={contributionBarData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="amount" fill="#0f172a" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold">Projection Settings</h2>
            <p className="mt-1 text-sm text-gray-500">
              Change the assumptions and watch the future value update.
            </p>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">SOL Price (AUD)</label>
                <input
                  type="number"
                  value={solPrice}
                  onChange={(e) => setSolPrice(Number(e.target.value))}
                  className="w-full rounded-lg border p-3"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Weekly Investment ($)</label>
                <input
                  type="number"
                  value={weeklyContribution}
                  onChange={(e) => setWeeklyContribution(Number(e.target.value))}
                  className="w-full rounded-lg border p-3"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Staking Rate (%)</label>
                <input
                  type="number"
                  value={stakingRate}
                  onChange={(e) => setStakingRate(Number(e.target.value))}
                  className="w-full rounded-lg border p-3"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Growth Rate (%)</label>
                <input
                  type="number"
                  value={growthRate}
                  onChange={(e) => setGrowthRate(Number(e.target.value))}
                  className="w-full rounded-lg border p-3"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Current Age</label>
                <input
                  type="number"
                  value={currentAge}
                  onChange={(e) => setCurrentAge(Number(e.target.value))}
                  className="w-full rounded-lg border p-3"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Target Age</label>
                <input
                  type="number"
                  value={targetAge}
                  onChange={(e) => setTargetAge(Number(e.target.value))}
                  className="w-full rounded-lg border p-3"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Add Contribution</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Add a new weekly buy directly from the dashboard.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAutoFillWeeklyBuy}
                className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
              >
                Auto-fill Weekly Buy
              </button>
            </div>

            <form onSubmit={handleAddContribution} className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Date</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full rounded-lg border p-3"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Amount (AUD)</label>
                  <input
                    type="number"
                    value={newAudAmount}
                    onChange={(e) => setNewAudAmount(Number(e.target.value))}
                    className="w-full rounded-lg border p-3"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">SOL Price (AUD)</label>
                  <input
                    type="number"
                    value={newSolPriceAud}
                    onChange={(e) => setNewSolPriceAud(Number(e.target.value))}
                    className="w-full rounded-lg border p-3"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Notes</label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full rounded-lg border p-3"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={savingContribution}
                  className="rounded-lg bg-black px-5 py-3 text-white disabled:opacity-50"
                >
                  {savingContribution ? "Saving..." : "Save Contribution"}
                </button>

                {saveMessage && (
                  <p
                    className={`text-sm ${
                      saveMessage.includes("success")
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {saveMessage}
                  </p>
                )}
              </div>
            </form>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Contribution History</h2>
              <p className="text-sm text-gray-500">
                Saved rows from your database
              </p>
            </div>

            {loadingContributions && (
              <span className="text-sm text-gray-500">Loading...</span>
            )}
          </div>

          {contributionsError ? (
            <p className="text-sm text-red-600">{contributionsError}</p>
          ) : contributions.length === 0 ? (
            <p className="text-sm text-gray-500">No contributions saved yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="border-b bg-gray-50 text-left">
                    <th className="p-3 text-sm font-semibold">Date</th>
                    <th className="p-3 text-sm font-semibold">AUD</th>
                    <th className="p-3 text-sm font-semibold">SOL Price</th>
                    <th className="p-3 text-sm font-semibold">SOL Bought</th>
                    <th className="p-3 text-sm font-semibold">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {contributions.map((row) => (
                    <tr key={row.id} className="border-b">
                      <td className="p-3 text-sm">{row.date}</td>
                      <td className="p-3 text-sm">{fmtAud(Number(row.aud_amount))}</td>
                      <td className="p-3 text-sm">{fmtAud(Number(row.sol_price_aud))}</td>
                      <td className="p-3 text-sm">{fmtNum(Number(row.sol_bought), 6)}</td>
                      <td className="p-3 text-sm">{row.notes || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}