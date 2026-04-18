"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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

type PriceHistoryRow = {
  date: string;
  price: number;
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

function StatCard({
  label,
  value,
  tone = "default",
  subtext,
}: {
  label: string;
  value: string;
  tone?: "default" | "green" | "red" | "blue" | "amber";
  subtext?: string;
}) {
  const toneClass =
    tone === "green"
      ? "text-green-600"
      : tone === "red"
      ? "text-red-600"
      : tone === "blue"
      ? "text-blue-600"
      : tone === "amber"
      ? "text-amber-600"
      : "text-gray-900";

  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${toneClass}`}>{value}</p>
      {subtext ? <p className="mt-1 text-xs text-gray-500">{subtext}</p> : null}
    </div>
  );
}

export default function Dashboard() {
  const [solPrice, setSolPrice] = useState(120);

  const [walletSol, setWalletSol] = useState(0.01);
  const [stakedSol, setStakedSol] = useState(5.3);

  const [weeklyContribution, setWeeklyContribution] = useState(50);
  const [stakingRate, setStakingRate] = useState(5.63);
  const [growthRate, setGrowthRate] = useState(15);
  const [currentAge, setCurrentAge] = useState(4);
  const [targetAge, setTargetAge] = useState(20);

  const [contributions, setContributions] = useState<ContributionRow[]>([]);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryRow[]>([]);

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

  async function loadPriceHistory() {
    try {
      const res = await fetch("/api/price-history");
      const data = await res.json();

      if (res.ok && Array.isArray(data)) {
        setPriceHistory(data);
      }
    } catch (err) {
      console.error("Price history fetch failed", err);
    }
  }

  useEffect(() => {
    fetchLivePrice();
    loadPriceHistory();

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

  const walletSolNum = Number(walletSol || 0);
  const stakedSolNum = Number(stakedSol || 0);
  const totalSolHeld = walletSolNum + stakedSolNum;
  const solPriceNum = Number(solPrice || 0);

  const portfolioValue = totalSolHeld * solPriceNum;
  const costBasis = totalInvested;
  const profitLoss = portfolioValue - costBasis;
  const returnPercent = costBasis > 0 ? (profitLoss / costBasis) * 100 : 0;

  const avgBuyPrice = useMemo(() => {
    if (totalSolFromBuys <= 0) return 0;
    return totalInvested / totalSolFromBuys;
  }, [totalInvested, totalSolFromBuys]);

  const boughtSolValue = totalSolFromBuys * solPriceNum;
  const walletOnlyValue = walletSolNum * solPriceNum;
  const stakedOnlyValue = stakedSolNum * solPriceNum;
  const manualDifferenceSol = totalSolHeld - totalSolFromBuys;

  const projectionResults = useMemo(() => {
    const years = Math.max(targetAge - currentAge, 0);
    const weeklyStake = Math.pow(1 + stakingRate / 100, 1 / 52) - 1;
    const weeklyGrowth = Math.pow(1 + growthRate / 100, 1 / 52) - 1;

    let solWithStaking = totalSolHeld;
    let solWithoutStaking = totalSolHeld;
    let price = solPrice;

    let futureContributionsOnly = totalInvested;

    for (let i = 0; i < years * 52; i++) {
      solWithStaking += weeklyContribution / price;
      solWithoutStaking += weeklyContribution / price;
      futureContributionsOnly += weeklyContribution;
      solWithStaking *= 1 + weeklyStake;
      price *= 1 + weeklyGrowth;
    }

    const projectedValueWithStaking = solWithStaking * price;
    const projectedValueWithoutStaking = solWithoutStaking * price;

    const stakingOnlyBoost =
      projectedValueWithStaking - projectedValueWithoutStaking;

    const priceGrowthBoost =
      projectedValueWithStaking - futureContributionsOnly - stakingOnlyBoost;

    return {
      projectedValue: projectedValueWithStaking,
      futureContributionsOnly,
      stakingOnlyBoost,
      priceGrowthBoost,
    };
  }, [
    currentAge,
    targetAge,
    stakingRate,
    growthRate,
    weeklyContribution,
    totalSolHeld,
    solPrice,
    totalInvested,
  ]);

  const projectedValue = projectionResults.projectedValue;

  const portfolioChartData = useMemo(() => {
    let runningInvested = 0;
    let runningSol = 0;

    return contributions.map((row) => {
      runningInvested += Number(row.aud_amount || 0);
      runningSol += Number(row.sol_bought || 0);

      return {
        date: shortDate(row.date),
        invested: Number(runningInvested.toFixed(2)),
        value: Number((runningSol * solPriceNum).toFixed(2)),
      };
    });
  }, [contributions, solPriceNum]);

  const contributionBarData = useMemo(() => {
    return contributions.map((row) => ({
      date: shortDate(row.date),
      amount: Number(row.aud_amount || 0),
    }));
  }, [contributions]);

  const projectionChartData = useMemo(() => {
    const years = Math.max(targetAge - currentAge, 0);
    const weeklyStake = Math.pow(1 + stakingRate / 100, 1 / 52) - 1;
    const weeklyGrowth = Math.pow(1 + growthRate / 100, 1 / 52) - 1;

    let sol = totalSolHeld;
    let price = solPriceNum;
    let invested = totalInvested;

    const points: {
      age: number;
      value: number;
      invested: number;
    }[] = [];

    points.push({
      age: currentAge,
      value: Number((sol * price).toFixed(2)),
      invested: Number(invested.toFixed(2)),
    });

    for (let year = 1; year <= years; year++) {
      for (let week = 0; week < 52; week++) {
        sol += weeklyContribution / price;
        invested += weeklyContribution;
        sol *= 1 + weeklyStake;
        price *= 1 + weeklyGrowth;
      }

      points.push({
        age: currentAge + year,
        value: Number((sol * price).toFixed(2)),
        invested: Number(invested.toFixed(2)),
      });
    }

    return points;
  }, [
    currentAge,
    targetAge,
    stakingRate,
    growthRate,
    weeklyContribution,
    totalSolHeld,
    solPriceNum,
    totalInvested,
  ]);

  const breakdownChartData = useMemo(() => {
    return [
      {
        name: "Your Contributions",
        value: Number(projectionResults.futureContributionsOnly.toFixed(2)),
        color: "#2563eb",
      },
      {
        name: "Price Growth",
        value: Number(Math.max(projectionResults.priceGrowthBoost, 0).toFixed(2)),
        color: "#16a34a",
      },
      {
        name: "Staking Boost",
        value: Number(Math.max(projectionResults.stakingOnlyBoost, 0).toFixed(2)),
        color: "#f59e0b",
      },
    ];
  }, [projectionResults]);

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
      await loadPriceHistory();
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
      const price = solPriceNum;
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
      await loadPriceHistory();
    } catch (err) {
      console.error(err);
      setSaveMessage("❌ Failed to save weekly buy");
    } finally {
      setSavingContribution(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Grandson SOL Tracker
            </h1>
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

        {/* CLEAN TOP SUMMARY */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            label="Portfolio Value"
            value={fmtAud(portfolioValue)}
            tone="green"
            subtext="All wallet + staked SOL at live price"
          />
          <StatCard
            label="Cost Basis"
            value={fmtAud(costBasis)}
            tone="blue"
            subtext="Total money contributed"
          />
          <StatCard
            label="Unrealised P/L"
            value={fmtAud(profitLoss)}
            tone={profitLoss >= 0 ? "green" : "red"}
            subtext="Portfolio value minus cost basis"
          />
          <StatCard
            label="Return %"
            value={`${returnPercent.toFixed(2)}%`}
            tone={returnPercent >= 0 ? "green" : "red"}
            subtext="Unrealised return on invested capital"
          />
          <StatCard
            label="Total SOL Held"
            value={fmtNum(totalSolHeld, 4)}
            subtext="Wallet SOL + staked SOL"
          />
          <StatCard
            label={`Projected @ Age ${targetAge}`}
            value={fmtAud(projectedValue)}
            tone="green"
            subtext="Based on current assumptions"
          />
        </div>

        <details className="rounded-2xl border bg-white p-5 shadow-sm">
          <summary className="cursor-pointer text-xl font-semibold">
            Net Position Details
          </summary>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="SOL Price (AUD)"
              value={fmtAud(solPriceNum)}
              subtext="Live from API"
            />
            <StatCard
              label="Bought SOL"
              value={fmtNum(totalSolFromBuys, 4)}
              subtext="From recorded contributions"
            />
            <StatCard
              label="Bought SOL Value"
              value={fmtAud(boughtSolValue)}
              subtext="Current value of bought SOL"
            />
            <StatCard
              label="Avg Buy Price"
              value={fmtAud(avgBuyPrice)}
              subtext="Average from contribution buys"
            />
            <StatCard
              label="Wallet Value"
              value={fmtAud(walletOnlyValue)}
              subtext="Value of wallet SOL only"
            />
            <StatCard
              label="Staked Value"
              value={fmtAud(stakedOnlyValue)}
              subtext="Value of staked SOL only"
            />
            <StatCard
              label="Manual Difference"
              value={fmtNum(manualDifferenceSol, 4)}
              tone={
                manualDifferenceSol > 0
                  ? "green"
                  : manualDifferenceSol < 0
                  ? "red"
                  : "default"
              }
              subtext="Total held minus bought SOL"
            />
          </div>
        </details>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold">SOL Price History</h2>
          <p className="mt-1 text-sm text-gray-500">
            Last 30 days of SOL price in AUD.
          </p>

          <div className="mt-5 h-80 w-full md:h-96">
            {priceHistory.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-gray-500">
                Loading price history...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={priceHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" minTickGap={30} />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="#16a34a"
                    strokeWidth={3}
                    dot={false}
                    name="SOL Price"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold">Portfolio Growth</h2>
            <p className="mt-1 text-sm text-gray-500">
              Invested amount vs current value of accumulated SOL from buys.
            </p>

            <div className="mt-5 h-72 w-full md:h-80">
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
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                      name="Invested"
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#16a34a"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
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

            <div className="mt-5 h-72 w-full md:h-80">
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

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold">Projection Curve to Age {targetAge}</h2>
          <p className="mt-1 text-sm text-gray-500">
            Estimated growth from now to your target age using weekly contributions,
            staking, and annual price growth assumptions.
          </p>

          <div className="mt-5 h-80 w-full md:h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={projectionChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="age" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="invested"
                  stroke="#2563eb"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Projected Invested"
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#16a34a"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Projected Value"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <details className="rounded-2xl border bg-white p-5 shadow-sm" open>
          <summary className="cursor-pointer text-xl font-semibold">
            Future Value Breakdown
          </summary>

          <p className="mt-2 text-sm text-gray-500">
            See how much of the future value comes from your own money, price growth,
            and staking.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-xl border bg-gray-50 p-4">
              <p className="text-sm text-gray-500">Your Contributions</p>
              <p className="mt-2 text-2xl font-bold">
                {fmtAud(projectionResults.futureContributionsOnly)}
              </p>
            </div>

            <div className="rounded-xl border bg-gray-50 p-4">
              <p className="text-sm text-gray-500">Price Growth Boost</p>
              <p className="mt-2 text-2xl font-bold text-green-600">
                {fmtAud(projectionResults.priceGrowthBoost)}
              </p>
            </div>

            <div className="rounded-xl border bg-gray-50 p-4">
              <p className="text-sm text-gray-500">Staking Boost</p>
              <p className="mt-2 text-2xl font-bold text-amber-600">
                {fmtAud(projectionResults.stakingOnlyBoost)}
              </p>
            </div>
          </div>

          <div className="mt-6 h-80 w-full md:h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={breakdownChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {breakdownChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </details>

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

        <details className="rounded-2xl border bg-white p-5 shadow-sm">
          <summary className="cursor-pointer text-xl font-semibold">
            Contribution History
          </summary>

          <div className="mt-4">
            {loadingContributions ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : contributionsError ? (
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
        </details>
      </div>
    </main>
  );
}