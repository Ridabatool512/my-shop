import "dotenv/config";
import { ProductCategory, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set.");
}

const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function updateImportedProductCategories() {
  try {
    const result = await prisma.product.updateMany({
      where: { slug: { startsWith: "shopify-" } },
      data: { category: ProductCategory.FASHION },
    });

    console.log(`Updated category to FASHION for ${result.count} Shopify products.`);
  } catch (error) {
    console.error("Failed to update Shopify product categories:", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

void updateImportedProductCategories();
