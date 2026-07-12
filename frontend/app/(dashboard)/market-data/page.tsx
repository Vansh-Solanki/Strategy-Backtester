import { auth } from "@/auth";
import { Header } from "@/components/layout/header";
import { TickerSearch } from "@/components/market-data/ticker-search";
import { DateRangePicker } from "@/components/market-data/date-range-picker";
import { PriceChart } from "@/components/market-data/price-chart";

export default async function MarketDataPage() {
  const session = await auth();

  return (
    <>
      <Header title="Market Data" userName={session?.user?.name ?? session?.user?.email ?? "User"} />
      <main className="space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <TickerSearch />
          <DateRangePicker />
        </div>
        <PriceChart />
      </main>
    </>
  );
}
