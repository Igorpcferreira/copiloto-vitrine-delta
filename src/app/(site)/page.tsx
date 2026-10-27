import { Suspense } from "react";
import { getStockNoun, getTenant } from "@/lib/data";
import Home from "@/theme/Home";
import HomeStock from "@/theme/HomeStock";
import { HomeStockSkeleton } from "@/components/Skeleton";

export default async function HomePage() {
  const [config, noun] = await Promise.all([getTenant(), getStockNoun()]);
  return (
    <Home
      config={config}
      base=""
      noun={noun}
      stock={
        <Suspense fallback={<HomeStockSkeleton />}>
          <HomeStock config={config} base="" noun={noun} />
        </Suspense>
      }
    />
  );
}
