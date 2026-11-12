import "dotenv/config";
import { inspect } from "node:util";
import { PrismaClient, ProductCategory, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set; the seed cannot connect to the database.");
}

const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const products: {
  name: string;
  slug: string;
  category: ProductCategory;
  description: string;
  price: number;
  stock: number;
  imageUrl: string;
}[] = [
  {
    name: "Apple iPhone 15 Pro 256GB",
    slug: "apple-iphone-15-pro-256gb-inr",
    category: ProductCategory.MOBILE_ACCESSORIES,
    description: "Premium iPhone with a pro camera system, titanium design, and 256GB storage. Price is an indicative India-market estimate.",
    price: 112610.08,
    stock: 8,
    imageUrl: "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-15-pro.jpg",
  },
  {
    name: "Samsung Galaxy S26 Ultra 256GB",
    slug: "samsung-galaxy-s26-ultra-256gb-inr",
    category: ProductCategory.MOBILE_ACCESSORIES,
    description: "Flagship Android smartphone with a high-resolution display, multi-lens camera, and fast performance. Price is an indicative India-market estimate.",
    price: 112704,
    stock: 10,
    imageUrl: "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s26-ultra.jpg",
  },
  {
    name: "OnePlus 13 256GB",
    slug: "oneplus-13-256gb-inr",
    category: ProductCategory.MOBILE_ACCESSORIES,
    description: "Fast Android phone with a high-refresh-rate display, versatile cameras, and 256GB storage. Price is an indicative India-market estimate.",
    price: 65744,
    stock: 12,
    imageUrl: "https://fdn2.gsmarena.com/vv/bigpic/oneplus-13.jpg",
  },
  {
    name: "Samsung Galaxy Z Flip7 256GB",
    slug: "samsung-galaxy-z-flip7-256gb-inr",
    category: ProductCategory.MOBILE_ACCESSORIES,
    description: "Compact foldable smartphone with a large cover display and 256GB storage. Price is an indicative India-market estimate.",
    price: 103312,
    stock: 9,
    imageUrl: "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-z-flip7.jpg",
  },
  {
    name: "Men's Regular-Fit Denim Jeans",
    slug: "mens-regular-fit-denim-jeans-inr",
    category: ProductCategory.FASHION,
    description: "Everyday regular-fit denim jeans with a comfortable cotton-blend finish.",
    price: 3287.2,
    stock: 25,
    imageUrl: "https://images.pexels.com/photos/1598507/pexels-photo-1598507.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
  {
    name: "Women's High-Rise Denim Jeans",
    slug: "womens-high-rise-denim-jeans-inr",
    category: ProductCategory.FASHION,
    description: "High-rise stretch denim jeans designed for comfortable everyday wear.",
    price: 3662.88,
    stock: 24,
    imageUrl: "https://images.pexels.com/photos/1598505/pexels-photo-1598505.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
  {
    name: "Men's Casual Oxford Shirt",
    slug: "mens-casual-oxford-shirt-inr",
    category: ProductCategory.FASHION,
    description: "Versatile button-down Oxford shirt for workdays and casual outings.",
    price: 2817.6,
    stock: 30,
    imageUrl: "https://images.pexels.com/photos/404280/pexels-photo-404280.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
  {
    name: "Women's Everyday Knit Top",
    slug: "womens-everyday-knit-top-inr",
    category: ProductCategory.FASHION,
    description: "Soft, easy-to-style knit top with a relaxed fit for everyday outfits.",
    price: 2348,
    stock: 34,
    imageUrl: "https://images.pexels.com/photos/4210860/pexels-photo-4210860.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
  {
    name: "Organic Cotton Baby Romper Set",
    slug: "organic-cotton-baby-romper-set-inr",
    category: ProductCategory.KIDS_PRODUCTS,
    description: "Soft, breathable cotton baby rompers with comfortable seams for everyday wear.",
    price: 1408.8,
    stock: 35,
    imageUrl: "https://images.pexels.com/photos/1032110/pexels-photo-1032110.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
  {
    name: "Wooden Learning Blocks",
    slug: "wooden-learning-blocks-inr",
    category: ProductCategory.KIDS_PRODUCTS,
    description: "Colorful learning blocks for early counting, color recognition, and creative play.",
    price: 1127.04,
    stock: 40,
    imageUrl: "https://images.pexels.com/photos/3662667/pexels-photo-3662667.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
  {
    name: "Kids Everyday Sneakers",
    slug: "kids-everyday-sneakers-inr",
    category: ProductCategory.KIDS_PRODUCTS,
    description: "Lightweight children's sneakers with a flexible sole and easy-adjust fastening.",
    price: 2348,
    stock: 28,
    imageUrl: "https://images.pexels.com/photos/3662668/pexels-photo-3662668.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
  {
    name: "Kids School Backpack",
    slug: "kids-school-backpack-inr",
    category: ProductCategory.KIDS_PRODUCTS,
    description: "Lightweight school backpack with padded straps and roomy compartments.",
    price: 1878.4,
    stock: 32,
    imageUrl: "https://images.pexels.com/photos/3661355/pexels-photo-3661355.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
  {
    name: "Wireless Over-Ear Headphones",
    slug: "wireless-over-ear-headphones-inr",
    category: ProductCategory.ELECTRONICS,
    description: "Comfortable wireless headphones with cushioned ear cups and long battery life.",
    price: 20662.4,
    stock: 26,
    imageUrl: "https://images.pexels.com/photos/3394665/pexels-photo-3394665.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
  {
    name: "AMOLED Smartwatch",
    slug: "amoled-smartwatch-inr",
    category: ProductCategory.ELECTRONICS,
    description: "Smartwatch with activity tracking, heart-rate monitoring, and smartphone notifications.",
    price: 15027.2,
    stock: 22,
    imageUrl: "https://images.pexels.com/photos/267394/pexels-photo-267394.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
  {
    name: "Portable Bluetooth Speaker",
    slug: "portable-bluetooth-speaker-inr",
    category: ProductCategory.ELECTRONICS,
    description: "Rechargeable Bluetooth speaker with portable design and clear everyday audio.",
    price: 8452.8,
    stock: 30,
    imageUrl: "https://images.pexels.com/photos/1279107/pexels-photo-1279107.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
  {
    name: "USB-C Fast Charger",
    slug: "usb-c-fast-charger-inr",
    category: ProductCategory.ELECTRONICS,
    description: "Compact USB-C power adapter for compatible phones, earbuds, and tablets.",
    price: 1502.72,
    stock: 70,
    imageUrl: "https://images.pexels.com/photos/1054713/pexels-photo-1054713.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
  {
    name: "Ryzen 7 RTX 5070 Gaming PC",
    slug: "ryzen-7-rtx-5070-gaming-pc-inr",
    category: ProductCategory.GAMING_PC,
    description: "High-performance gaming desktop with a Ryzen 7 processor, RTX 5070 graphics, 32GB memory, and NVMe storage.",
    price: 150272,
    stock: 3,
    imageUrl: "https://images.pexels.com/photos/2582937/pexels-photo-2582937.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
  {
    name: "Mechanical RGB Gaming Keyboard",
    slug: "mechanical-rgb-gaming-keyboard-inr",
    category: ProductCategory.GAMING_PC,
    description: "Full-size mechanical keyboard with responsive switches, customizable RGB lighting, and anti-ghosting.",
    price: 4977.76,
    stock: 18,
    imageUrl: "https://images.pexels.com/photos/777001/pexels-photo-777001.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
  {
    name: "High-DPI Wired Gaming Mouse",
    slug: "high-dpi-wired-gaming-mouse-inr",
    category: ProductCategory.GAMING_PC,
    description: "Ergonomic gaming mouse with adjustable DPI, programmable buttons, and a durable braided cable.",
    price: 2535.84,
    stock: 21,
    imageUrl: "https://images.pexels.com/photos/2047905/pexels-photo-2047905.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
  {
    name: "PlayStation 5 Slim Console",
    slug: "playstation-5-slim-console-inr",
    category: ProductCategory.PS5_ACCESSORIES,
    description: "Slim PlayStation console with fast SSD storage and immersive 4K gaming. Price is an indicative India-market estimate.",
    price: 56352,
    stock: 6,
    imageUrl: "https://media.direct.playstation.com/is/image/sierialto/2025-PS5-Disc-Hero-3-packaging-US%20v2?wid=1200",
  },
];

const legacySeedProductSlugs = [
  "apple-iphone-17-pro-max-256gb",
  "samsung-galaxy-s26-ultra-256gb",
  "usb-c-30w-fast-charger",
  "shockproof-smartphone-cover",
  "wireless-anc-earbuds",
  "portable-bluetooth-speaker",
  "amoled-smartwatch",
  "over-ear-wireless-headphones",
  "20000mah-usbc-power-bank",
  "organic-cotton-baby-romper-set",
  "wooden-learning-blocks",
  "kids-everyday-sneakers",
  "kids-school-backpack",
  "mens-classic-denim-jeans",
  "womens-high-rise-jeans",
  "mens-oxford-casual-shirt",
  "womens-everyday-knit-top",
  "55-inch-4k-uhd-smart-tv",
  "65-inch-4k-qled-smart-tv",
  "android-tv-streaming-box-4k",
  "ryzen-7-rtx-5070-gaming-pc",
  "mechanical-rgb-gaming-keyboard",
  "high-dpi-wired-gaming-mouse",
  "playstation-5-slim-console",
  "wireless-ps5-dualsense-controller",
  "ps5-adventure-game-disc",
  "wireless-headphones",
  "smart-watch",
  "gaming-mouse",
  "mechanical-keyboard",
  "usb-c-charger",
];

async function seedUser({
  email,
  name,
  password,
  role,
  createdById,
}: {
  email: string;
  name: string;
  password: string;
  role: Role;
  createdById?: string | null;
}) {
  const data = {
    name,
    password,
    role,
    ...(createdById !== undefined ? { createdById } : {}),
  };

  return prisma.user.upsert({
    where: { email },
    update: data,
    create: { email, ...data },
    select: { id: true },
  });
}

async function runSeed() {
  try {
    const password = await bcrypt.hash("password123", 10);

    const superAdmin = await seedUser({
      email: "superadmin@test.com",
      name: "Super Admin",
      password,
      role: Role.SUPER_ADMIN,
      createdById: null,
    });

    await seedUser({
      email: "admin@test.com",
      name: "Admin User",
      password,
      role: Role.ADMIN,
      createdById: superAdmin.id,
    });

    await seedUser({
      email: "seller@test.com",
      name: "Seller User",
      password,
      role: Role.SELLER,
    });

    await seedUser({
      email: "buyer@test.com",
      name: "Buyer User",
      password,
      role: Role.BUYER,
    });

    for (const product of products) {
      await prisma.product.upsert({
        where: { slug: product.slug },
        update: product,
        create: product,
      });
    }

    const legacyProducts = await prisma.product.findMany({
      where: { slug: { in: legacySeedProductSlugs } },
      select: {
        id: true,
        _count: { select: { orderItems: true } },
      },
    });

    for (const product of legacyProducts) {
      if (product._count.orderItems > 0) {
        await prisma.product.update({
          where: { id: product.id },
          data: { imageUrl: null, stock: 0 },
        });
      } else {
        await prisma.product.delete({ where: { id: product.id } });
      }
    }

    console.log(
      `Seeded Super Admin, Admin, Seller, and Buyer accounts, plus ${products.length} INR catalog products.`
    );
  } catch (error) {
    console.error("Database seed failed:", inspect(error, { depth: null }));
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

void runSeed();
