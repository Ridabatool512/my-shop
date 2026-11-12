import axios from "axios";
import { lookup as dnsLookup } from "node:dns";
import { Agent as HttpsAgent } from "node:https";
import { isIP, type LookupFunction } from "node:net";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type LookupAddress = {
  address: string;
  family: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) {
    const parts = address.split(".").map(Number);
    if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
      return false;
    }

    const [first, second, third] = parts;
    return !(
      first === 0 ||
      first === 10 ||
      first === 127 ||
      first >= 224 ||
      (first === 100 && second >= 64 && second <= 127) ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168) ||
      (first === 192 && second === 0 && (third === 0 || third === 2)) ||
      (first === 192 && second === 88 && third === 99) ||
      (first === 198 && (second === 18 || second === 19)) ||
      (first === 198 && second === 51 && third === 100) ||
      (first === 203 && second === 0 && third === 113)
    );
  }

  const normalized = address.toLowerCase();
  const firstGroup = Number.parseInt(normalized.split(":")[0] || "0", 16);
  return (
    family === 6 &&
    firstGroup >= 0x2000 &&
    firstGroup <= 0x3fff &&
    !normalized.startsWith("2001:db8:")
  );
}

const publicDnsLookup: LookupFunction = (hostname, options, callback) => {
  dnsLookup(hostname, { all: true, verbatim: true }, (error, addresses) => {
    if (error) {
      callback(error, "", 0);
      return;
    }

    const results: LookupAddress[] = addresses.map(({ address, family }) => ({
      address,
      family,
    }));

    if (results.length === 0 || results.some(({ address }) => !isPublicAddress(address))) {
      const blocked = Object.assign(
        new Error("The requested store resolves to a non-public address."),
        { code: "EACCES" }
      );
      callback(blocked, "", 0);
      return;
    }

    if (options.all) {
      callback(null, results);
      return;
    }

    callback(null, results[0].address, results[0].family);
  });
};

const httpsAgent = new HttpsAgent({ lookup: publicDnsLookup });

function parseStoreUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();

    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      (url.port && url.port !== "443") ||
      url.search ||
      url.hash ||
      (url.pathname !== "/" && url.pathname !== "/products.json") ||
      isIP(hostname) !== 0 ||
      hostname.length < 3 ||
      !hostname.includes(".") ||
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal")
    ) {
      return null;
    }

    url.pathname = "/products.json";
    return url;
  } catch {
    return null;
  }
}

function cleanDescription(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 2000);
}

function toSlugPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

async function getInrRate(sourceCurrency: string): Promise<number> {
  if (sourceCurrency === "INR") {
    return 1;
  }

  const response = await fetch(
    `https://api.frankfurter.app/latest?from=${encodeURIComponent(sourceCurrency)}&to=INR`,
    { signal: AbortSignal.timeout(10_000), cache: "no-store" }
  );

  if (!response.ok) {
    throw new Error("Unable to retrieve a current exchange rate.");
  }

  const data: unknown = await response.json();
  if (
    !isRecord(data) ||
    !isRecord(data.rates) ||
    typeof data.rates.INR !== "number" ||
    !Number.isFinite(data.rates.INR) ||
    data.rates.INR <= 0
  ) {
    throw new Error("The exchange-rate response did not contain a valid INR rate.");
  }

  return data.rates.INR;
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  if (
    !isRecord(body) ||
    typeof body.storeUrl !== "string" ||
    typeof body.sourceCurrency !== "string"
  ) {
    return NextResponse.json(
      { error: "A Shopify store URL and source currency are required." },
      { status: 400 }
    );
  }

  const storeUrl = parseStoreUrl(body.storeUrl.trim());
  const sourceCurrency = body.sourceCurrency.trim().toUpperCase();

  if (!storeUrl) {
    return NextResponse.json(
      { error: "Provide an HTTPS Shopify store URL ending at / or /products.json." },
      { status: 400 }
    );
  }

  if (!/^[A-Z]{3}$/.test(sourceCurrency)) {
    return NextResponse.json(
      { error: "Source currency must be a three-letter currency code, such as USD or INR." },
      { status: 400 }
    );
  }

  let rate: number;
  let productsPayload: unknown;
  try {
    [rate, productsPayload] = await Promise.all([
      getInrRate(sourceCurrency),
      axios
        .get<unknown>(storeUrl.toString(), {
          httpsAgent,
          proxy: false,
          maxRedirects: 0,
          timeout: 12_000,
          maxContentLength: 5 * 1024 * 1024,
          headers: { Accept: "application/json" },
          params: { limit: 50 },
        })
        .then((response) => response.data),
    ]);
  } catch (error) {
    console.error("Shopify product fetch failed:", error);
    return NextResponse.json(
      { error: "Unable to fetch products or exchange rates. Verify the store URL and currency." },
      { status: 502 }
    );
  }

  if (
    !isRecord(productsPayload) ||
    !Array.isArray(productsPayload.products)
  ) {
    return NextResponse.json(
      { error: "The store did not return a Shopify products JSON response." },
      { status: 502 }
    );
  }

  const hostSlug = toSlugPart(storeUrl.hostname);
  let imported = 0;
  let skipped = 0;

  try {
    for (const rawProduct of productsPayload.products.slice(0, 50)) {
      if (!isRecord(rawProduct) || !Array.isArray(rawProduct.variants)) {
        skipped += 1;
        continue;
      }

      const firstVariant = rawProduct.variants.find(isRecord);
      const productName =
        typeof rawProduct.title === "string" ? rawProduct.title.trim() : "";
      const rawPrice = firstVariant?.price;
      const sourcePrice =
        typeof rawPrice === "number"
          ? rawPrice
          : typeof rawPrice === "string"
            ? Number(rawPrice)
            : Number.NaN;
      const id =
        typeof rawProduct.id === "string" || typeof rawProduct.id === "number"
          ? String(rawProduct.id)
          : typeof rawProduct.handle === "string"
            ? rawProduct.handle
            : "";

      if (!productName || !id || !Number.isFinite(sourcePrice) || sourcePrice <= 0) {
        skipped += 1;
        continue;
      }

      const image = Array.isArray(rawProduct.images)
        ? rawProduct.images.find(isRecord)
        : undefined;
      let imageUrl: string | null = null;
      if (typeof image?.src === "string") {
        try {
          const parsedImageUrl = new URL(image.src);
          if (parsedImageUrl.protocol === "https:") {
            imageUrl = parsedImageUrl.toString();
          }
        } catch {
          imageUrl = null;
        }
      }

      const variants = rawProduct.variants.filter(isRecord);
      const quantities = variants
        .map((variant) => variant.inventory_quantity)
        .filter(
          (quantity): quantity is number =>
            typeof quantity === "number" &&
            Number.isInteger(quantity) &&
            quantity >= 0
        );
      const stock = Math.max(
        10,
        quantities.reduce((total, quantity) => total + quantity, 0)
      );
      const convertedPrice = Math.round(sourcePrice * rate * 100) / 100;
      const rawDescription =
        typeof rawProduct.body_html === "string" ? rawProduct.body_html : "";
      const description = cleanDescription(rawDescription) || productName;
      const idSlug = toSlugPart(id);
      if (!idSlug) {
        skipped += 1;
        continue;
      }
      const slug = `shopify-${hostSlug}-${idSlug}`;

      await prisma.product.upsert({
        where: { slug },
        update: {
          name: productName.slice(0, 200),
          description,
          price: convertedPrice,
          imageUrl,
          stock,
        },
        create: {
          name: productName.slice(0, 200),
          slug,
          category: "FASHION",
          description,
          price: convertedPrice,
          imageUrl,
          stock,
        },
      });

      imported += 1;
    }
  } catch (error) {
    console.error("Shopify product database sync failed:", error);
    return NextResponse.json(
      { error: "Products were fetched, but database synchronization failed." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    imported,
    skipped,
    sourceCurrency,
    exchangeRateToINR: rate,
  });
}
