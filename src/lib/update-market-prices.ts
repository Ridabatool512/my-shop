import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set.");
}

const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

type TargetPrice = {
  seedSlug?: string;
  manualSlug?: string;
  usd: number;
};

const targetPrices: TargetPrice[] = [
  { seedSlug: "apple-iphone-15-pro-256gb-inr", manualSlug: "manual-apple-iphone-15-pro-256gb", usd: 1199 },
  { seedSlug: "samsung-galaxy-s26-ultra-256gb-inr", manualSlug: "manual-samsung-galaxy-s26-ultra-256gb", usd: 1200 },
  { seedSlug: "oneplus-13-256gb-inr", manualSlug: "manual-oneplus-13-256gb", usd: 700 },
  { seedSlug: "samsung-galaxy-z-flip7-256gb-inr", manualSlug: "manual-samsung-galaxy-z-flip7-256gb", usd: 1100 },
  { manualSlug: "manual-fast-usbc-phone-charger", usd: 16 },
  { seedSlug: "mens-regular-fit-denim-jeans-inr", manualSlug: "manual-mens-regular-fit-denim-jeans", usd: 35 },
  { seedSlug: "womens-high-rise-denim-jeans-inr", manualSlug: "manual-womens-high-rise-denim-jeans", usd: 39 },
  { seedSlug: "mens-casual-oxford-shirt-inr", manualSlug: "manual-mens-casual-oxford-shirt", usd: 30 },
  { seedSlug: "womens-everyday-knit-top-inr", manualSlug: "manual-womens-everyday-knit-top", usd: 25 },
  { manualSlug: "manual-lightweight-hooded-jacket", usd: 55 },
  { seedSlug: "wireless-over-ear-headphones-inr", manualSlug: "manual-wireless-over-ear-headphones", usd: 220 },
  { seedSlug: "amoled-smartwatch-inr", manualSlug: "manual-amoled-fitness-smartwatch", usd: 160 },
  { seedSlug: "portable-bluetooth-speaker-inr", manualSlug: "manual-portable-bluetooth-speaker", usd: 90 },
  { seedSlug: "usb-c-fast-charger-inr", manualSlug: "manual-usbc-fast-charger", usd: 16 },
  { manualSlug: "manual-wireless-computer-mouse", usd: 25 },
  { seedSlug: "organic-cotton-baby-romper-set-inr", manualSlug: "manual-organic-cotton-baby-romper", usd: 15 },
  { seedSlug: "wooden-learning-blocks-inr", manualSlug: "manual-wooden-learning-blocks", usd: 12 },
  { seedSlug: "kids-everyday-sneakers-inr", manualSlug: "manual-kids-everyday-sneakers", usd: 25 },
  { seedSlug: "kids-school-backpack-inr", manualSlug: "manual-kids-school-backpack", usd: 20 },
  { manualSlug: "manual-kids-plush-toy", usd: 12 },
  { seedSlug: "ryzen-7-rtx-5070-gaming-pc-inr", usd: 1600 },
  { seedSlug: "mechanical-rgb-gaming-keyboard-inr", manualSlug: "manual-mechanical-rgb-gaming-keyboard", usd: 53 },
  { seedSlug: "high-dpi-wired-gaming-mouse-inr", manualSlug: "manual-high-dpi-wired-gaming-mouse", usd: 27 },
  { seedSlug: "playstation-5-slim-console-inr", usd: 600 },
];

async function getUsdToInrRate(): Promise<{ rate: number; date: string }> {
  const response = await fetch(
    "https://api.frankfurter.app/latest?from=USD&to=INR",
    { signal: AbortSignal.timeout(10_000), cache: "no-store" }
  );
  if (!response.ok) {
    throw new Error(`Unable to retrieve the latest USD/INR rate (${response.status}).`);
  }

  const data: unknown = await response.json();
  if (
    typeof data !== "object" ||
    data === null ||
    !("rates" in data) ||
    typeof data.rates !== "object" ||
    data.rates === null ||
    !("INR" in data.rates) ||
    typeof data.rates.INR !== "number" ||
    !Number.isFinite(data.rates.INR) ||
    data.rates.INR <= 0 ||
    !("date" in data) ||
    typeof data.date !== "string"
  ) {
    throw new Error("Invalid USD/INR exchange-rate response.");
  }

  return { rate: data.rates.INR, date: data.date };
}

async function main() {
  try {
    const { rate, date } = await getUsdToInrRate();
    let updated = 0;

    for (const product of targetPrices) {
      const priceInInr = Math.round(product.usd * rate * 100) / 100;

      if (product.seedSlug) {
        const result = await prisma.product.updateMany({
          where: { slug: product.seedSlug },
          data: { price: priceInInr },
        });
        updated += result.count;
      }

      if (product.manualSlug) {
        const result = await prisma.product.updateMany({
          where: { slug: { startsWith: `${product.manualSlug}-` } },
          data: { price: priceInInr },
        });
        updated += result.count;
      }
    }

    console.log(
      `Updated ${updated} catalog product prices using $1 = ₹${rate} (rate date ${date}).`
    );
  } catch (error) {
    console.error("Failed to update catalog market prices:", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

void main();
