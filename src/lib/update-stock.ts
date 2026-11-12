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

async function updateImportedProductStock() {
  try {
    const result = await prisma.product.updateMany({
      where: {
        stock: 0,
      },
      data: { stock: 10 },
    });

    console.log(`Updated stock to 10 for ${result.count} Shopify products.`);
  } catch (error) {
    console.error("Failed to update Shopify product stock:", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

void updateImportedProductStock();
