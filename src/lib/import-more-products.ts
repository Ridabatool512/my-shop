import "dotenv/config";
import { ProductCategory, Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set.");
}

const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

type JewelleryProduct = {
  name: string;
  slug: string;
  description: string;
  priceUsd: number;
  imageUrl: string;
  previousNames?: readonly string[];
};

const jewelleryProducts: readonly JewelleryProduct[] = [
  {
    name: "Sterling Silver Solitaire Ring",
    slug: "silver-solitaire-ring",
    description: "Polished sterling silver ring with a classic solitaire setting.",
    priceUsd: 50,
    imageUrl: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=1200&q=85",
  },
  {
    name: "Pearl Stud Earrings",
    slug: "pearl-stud-earrings",
    description: "Elegant luminous pearl studs with a refined precious-metal finish.",
    priceUsd: 120,
    imageUrl: "https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=1200&q=85",
  },
  {
    name: "Gold-Plated Pendant Necklace",
    slug: "gold-plated-pendant-necklace",
    description: "Delicate gold-plated chain with a polished everyday pendant.",
    priceUsd: 250,
    imageUrl: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1200&q=85",
  },
  {
    name: "Classic 14K Gold Chain",
    slug: "classic-14k-gold-chain",
    description: "Timeless 14K gold chain with a smooth, versatile finish.",
    priceUsd: 500,
    imageUrl: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=1200&q=85",
  },
  {
    name: "Sapphire Halo Ring",
    slug: "sapphire-halo-ring",
    description: "Blue sapphire centerpiece framed by a brilliant halo setting.",
    priceUsd: 1500,
    imageUrl: "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?auto=format&fit=crop&w=1200&q=85",
  },
  {
    name: "Emerald Drop Earrings",
    slug: "emerald-drop-earrings",
    description: "Statement emerald-tone drop earrings in a premium setting.",
    priceUsd: 3000,
    imageUrl: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=1200&q=85",
  },
  {
    name: "Diamond Tennis Bracelet",
    slug: "diamond-tennis-bracelet",
    description: "Classic line bracelet with carefully matched brilliant-cut stones.",
    priceUsd: 5000,
    imageUrl: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=1200&q=85",
  },
  {
    name: "White Gold Diamond Pendant",
    slug: "white-gold-diamond-pendant",
    description: "Refined white-gold pendant with a bright diamond centerpiece.",
    priceUsd: 10000,
    imageUrl: "https://images.unsplash.com/photo-1602173574767-37ac01994b2a?auto=format&fit=crop&w=1200&q=85",
  },
  {
    name: "Diamond Statement Necklace",
    slug: "diamond-statement-necklace",
    description: "A bold fine-jewellery necklace designed for formal occasions.",
    priceUsd: 15000,
    imageUrl: "https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=1200&q=85",
  },
  {
    name: "Three-Stone Diamond Ring",
    slug: "three-stone-diamond-ring",
    description: "Three brilliant stones set in a balanced, heirloom-inspired design.",
    priceUsd: 25000,
    imageUrl: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=1200&q=85",
  },
  {
    name: "Ruby and Diamond Heritage Necklace",
    slug: "ruby-diamond-heritage-necklace",
    description: "Ruby-inspired centerpiece and diamond accents in an ornate necklace.",
    priceUsd: 50000,
    imageUrl: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1200&q=85",
  },
  {
    name: "Collector's Gemstone Parure",
    slug: "collectors-gemstone-parure",
    description: "Coordinated high-jewellery set featuring vivid colored gemstones.",
    priceUsd: 100000,
    imageUrl: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=1200&q=85",
  },
  {
    name: "Platinum Diamond Statement Necklace",
    slug: "platinum-royal-tiara",
    description: "A handcrafted platinum necklace with intricate diamond detailing.",
    priceUsd: 250000,
    imageUrl: "https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=1200&q=85",
    previousNames: ["Platinum Royal Tiara"],
  },
  {
    name: "Imperial Diamond Choker Necklace",
    slug: "imperial-diamond-crown",
    description: "A dramatic diamond choker necklace with elaborate detailing.",
    priceUsd: 500000,
    imageUrl: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=1200&q=85",
    previousNames: ["Imperial Diamond Crown"],
  },
  {
    name: "Royal Heirloom Diamond Necklace",
    slug: "royal-heirloom-crown",
    description: "A one-of-a-kind heirloom necklace with exceptional gemstones and fine craftsmanship.",
    priceUsd: 1000000,
    imageUrl: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1200&q=85",
    previousNames: ["Royal Heirloom Crown"],
  },
] as const;

type CatalogProduct = {
  name: string;
  description: string;
  priceUsd: number;
  category: ProductCategory;
  slug: string;
};

type CatalogEntry = readonly [name: string, description: string, priceUsd: number];

const fragranceOilEntries: readonly CatalogEntry[] = [
  ["Amber Oud Concentrated Oil", "Warm amber, smooth oud, and a lingering woody dry-down.", 32],
  ["Damask Rose Attar", "A rich rose fragrance oil with soft petals and a clean musk base.", 28],
  ["Sandalwood Reserve Oil", "Creamy sandalwood blended with gentle spice and balsamic warmth.", 35],
  ["White Musk Perfume Oil", "A soft, clean musk designed for a subtle everyday fragrance.", 22],
  ["Jasmine Night Bloom Oil", "Intense jasmine florals balanced by sweet nectar notes.", 26],
  ["Vanilla Bean Fragrance Oil", "Comforting vanilla bean with warm amber and a silky finish.", 24],
  ["Saffron Oud Luxury Oil", "Precious saffron and deep oud create a bold, elegant scent.", 48],
  ["Citrus Neroli Attar", "Bright neroli and fresh citrus over a light floral heart.", 25],
  ["Musk Tahara Oil", "A gentle powdery musk with a smooth, skin-close character.", 20],
  ["Velvet Patchouli Oil", "Earthy patchouli softened with sweet woods and amber.", 29],
  ["Blue Lotus Perfume Oil", "Airy lotus petals with cool aquatic and delicate green notes.", 31],
  ["Golden Rose Oud Oil", "Velvety rose and polished oud in a rich, long-wearing blend.", 42],
  ["Cardamom Spice Attar", "Fresh cardamom, aromatic herbs, and warm cedarwood.", 27],
  ["White Sandal Attar", "A calm sandalwood oil with creamy, lightly smoky facets.", 30],
  ["Oud and Leather Oil", "Smoky oud paired with supple leather and a hint of spice.", 39],
  ["Egyptian Jasmine Oil", "Green jasmine petals with a luminous floral character.", 33],
  ["Fig and Cedar Fragrance Oil", "Juicy fig balanced by dry cedar and a touch of green leaf.", 26],
  ["Coconut Cream Perfume Oil", "Creamy coconut and soft vanilla with a sun-warmed finish.", 23],
  ["Golden Amber Roll-On Oil", "Resinous amber with gentle sweetness and soft woods.", 21],
  ["Lavender Fields Attar", "Relaxing lavender blended with herbal and musky notes.", 19],
  ["Smoky Vetiver Oil", "Earthy vetiver, dry grass, and subtle mineral woods.", 34],
  ["Peach Blossom Perfume Oil", "Juicy peach and delicate blossoms over a sheer musk base.", 24],
  ["Oud al Shams Concentrate", "A rich oriental blend of oud, amber, and aromatic spice.", 55],
  ["Green Tea Citrus Oil", "Fresh green tea with sparkling citrus and a clean finish.", 18],
  ["Magnolia Silk Attar", "Soft magnolia petals with a creamy, elegant floral heart.", 30],
  ["Praline Vanilla Oil", "Sweet praline and vanilla balanced by smooth tonka bean.", 25],
  ["Rosewood Musk Oil", "Polished rosewood softened with clean, comforting musk.", 28],
  ["Bergamot Cedar Perfume Oil", "Bright bergamot and crisp cedar in a modern woody blend.", 27],
  ["Black Currant Blossom Oil", "Tart black currant opens into a juicy floral fragrance.", 29],
  ["Ambergris Inspired Oil", "Oceanic amber accords with a warm, softly mineral base.", 45],
  ["Orchid Petal Attar", "Elegant orchid and white florals with a gentle sweet finish.", 32],
  ["Spiced Honey Perfume Oil", "Golden honey, clove, and warm woods in a cozy blend.", 26],
  ["Desert Rose Concentrate", "Dry rose petals, sunlit amber, and a smooth resinous base.", 38],
  ["Fresh Linen Musk Oil", "Crisp linen and airy musk for a light, freshly washed scent.", 17],
  ["Noor Oud Signature Oil", "A refined oud signature with soft florals and glowing amber.", 52],
];

const scentedCandleEntries: readonly CatalogEntry[] = [
  ["Vanilla Bean Soy Candle", "Hand-poured soy wax with creamy vanilla and soft sugar notes.", 24],
  ["Sandalwood Smoke Candle", "Warm sandalwood and a delicate smoky note for quiet evenings.", 32],
  ["Fresh Linen Candle", "A clean cotton and fresh-air scent in a reusable glass vessel.", 22],
  ["Amber and Cedar Candle", "Golden amber, cedarwood, and a comforting balsamic finish.", 28],
  ["Rose Garden Candle", "Fresh garden roses with green stems and a soft musk base.", 26],
  ["Citrus Grove Candle", "Bright orange, lemon zest, and uplifting green citrus notes.", 20],
  ["Lavender Fields Candle", "Calming lavender and herbal notes in a slow-burning soy candle.", 23],
  ["Coastal Breeze Candle", "Sea salt, airy ozone, and driftwood evoke a cool coastal day.", 25],
  ["Cinnamon Chai Candle", "Steamed chai spices with cinnamon, cardamom, and vanilla.", 24],
  ["Jasmine Blossom Candle", "Sweet jasmine blossoms balanced with delicate white tea.", 27],
  ["Fig and Moss Candle", "Ripe fig, soft moss, and dry woods create an earthy fragrance.", 29],
  ["Cashmere Woods Candle", "A smooth blend of amber, cashmere woods, and soft musk.", 34],
  ["Coconut Milk Candle", "Creamy coconut milk with a gentle tropical sweetness.", 22],
  ["Eucalyptus Spa Candle", "Refreshing eucalyptus and mint for a clean spa-inspired scent.", 21],
  ["Maple Pumpkin Candle", "Warm pumpkin, maple, and baking spices for cozy nights.", 26],
  ["Midnight Oud Candle", "Deep oud and amber create a rich, elegant room fragrance.", 38],
  ["Peony Petals Candle", "Fresh peony and dewy rose with a light floral finish.", 25],
  ["Apple Orchard Candle", "Crisp orchard apple with a hint of clove and warm woods.", 23],
  ["White Tea and Ginger Candle", "Delicate white tea lifted by fresh ginger and citrus.", 27],
  ["Smoked Vanilla Candle", "Dark vanilla, soft smoke, and a touch of sweet resin.", 30],
  ["Wildflower Meadow Candle", "A breezy bouquet of wildflowers, grasses, and soft honey.", 24],
  ["Espresso Roast Candle", "Roasted coffee beans with a creamy mocha undertone.", 22],
  ["Lemongrass Sage Candle", "Zesty lemongrass and aromatic sage in a fresh herbal blend.", 21],
  ["Palo Santo Candle", "A mellow woody aroma inspired by palo santo and warm resin.", 32],
  ["Blueberry Crumble Candle", "Juicy blueberries, buttery crumble, and a hint of vanilla.", 24],
  ["Tobacco Leaf Candle", "Smooth tobacco leaf with spice, amber, and polished woods.", 35],
  ["Honeysuckle Candle", "Lush honeysuckle blossoms with a sunlit, nectar-sweet finish.", 25],
  ["Rainy Day Candle", "Petrichor, green leaves, and cool mineral notes after rain.", 26],
  ["Cardamom Coffee Candle", "Fresh coffee joined by aromatic cardamom and dark cocoa.", 27],
  ["Golden Hour Candle", "Warm citrus, amber, and soft florals capture a late-summer sunset.", 31],
  ["Pine Forest Candle", "Crisp evergreen, fir needles, and earthy forest floor notes.", 23],
  ["Salted Caramel Candle", "Buttery caramel, a pinch of sea salt, and smooth vanilla.", 24],
  ["Garden Mint Candle", "Cool garden mint and leafy herbs with a fresh, clean finish.", 20],
  ["Nocturne Black Candle", "A sophisticated blend of black tea, cedar, and dark amber.", 36],
  ["Blooming Magnolia Candle", "Creamy magnolia petals with bright citrus and soft woods.", 28],
];

const resinArtEntries: readonly CatalogEntry[] = [
  ["Ocean Wave Resin Coaster Set", "Four glossy coasters with layered blue ocean-wave resin detail.", 38],
  ["Turquoise Resin Serving Tray", "A handcrafted serving tray with flowing turquoise resin accents.", 74],
  ["Gold Leaf Resin Trinket Dish", "A small catchall dish with translucent resin and gold-leaf details.", 26],
  ["Midnight Galaxy Resin Wall Art", "A deep-blue abstract resin panel with shimmering celestial tones.", 120],
  ["Blue River Resin Desk Clock", "A modern resin clock with a vivid blue river-style inlay.", 68],
  ["Botanical Resin Bookmark Set", "Pressed botanical details preserved in a set of glossy resin bookmarks.", 18],
  ["Marble Swirl Resin Jewelry Dish", "A sculpted jewelry dish with elegant white and charcoal resin swirls.", 32],
  ["Sunset Resin Wall Panel", "A vibrant handmade abstract panel inspired by a glowing sunset.", 110],
  ["Cobalt Resin Cheese Board", "A decorative serving board with a flowing cobalt resin accent.", 82],
  ["Floral Resin Pendant Necklace", "A lightweight pendant preserving delicate dried flowers in clear resin.", 28],
  ["Emerald Resin Catchall Tray", "A polished catchall tray with layered emerald and gold-tone details.", 46],
  ["Ocean Tide Resin Keychain Pair", "Two handmade keychains with miniature ocean-inspired resin designs.", 16],
  ["Rose Gold Resin Pen Holder", "A sturdy desktop pen holder finished with rose-gold resin accents.", 34],
  ["Amethyst Resin Pyramid Decor", "A faceted decorative resin pyramid in translucent amethyst hues.", 42],
  ["Coastal Resin Picture Frame", "A handmade photo frame with a soft blue coastal resin border.", 39],
  ["Terracotta Resin Coaster Set", "Four warm-toned resin coasters with a modern marbled pattern.", 36],
  ["Iridescent Resin Moon Sculpture", "A crescent-moon sculpture with shifting iridescent resin layers.", 58],
  ["Wildflower Resin Trinket Box", "A small keepsake box with preserved wildflowers beneath clear resin.", 44],
  ["Sapphire Resin Cheese Knives", "A set of serving knives with polished sapphire-tone resin handles.", 49],
  ["Abstract Resin Pour Canvas", "A one-of-a-kind abstract art panel with layered glossy resin color.", 145],
  ["Teal Resin Bookends", "A matching pair of weighted bookends with rich teal resin ribbons.", 64],
  ["Clear Resin Geode Wall Art", "A geode-inspired wall piece with clear resin and crystal-like details.", 138],
  ["Ocean Foam Resin Ring Dish", "A compact ring dish with blue resin and delicate white wave effects.", 24],
  ["Lavender Resin Incense Holder", "A handcrafted incense holder with soft lavender resin marbling.", 29],
  ["Copper Resin Table Centerpiece", "A sculptural tabletop accent with copper and smoky resin swirls.", 96],
  ["Pressed Fern Resin Coasters", "Four botanical coasters featuring preserved fern fronds in clear resin.", 41],
  ["Aqua Resin Serving Platter", "An elongated serving platter finished with flowing aqua resin patterns.", 89],
  ["Mosaic Resin Wall Hanging", "A colorful wall hanging built from layered mosaic-style resin pieces.", 105],
  ["Black Onyx Resin Desk Organizer", "A compact organizer with glossy black resin and subtle stone-like veins.", 52],
  ["Pearl Resin Hair Clip Set", "Two handmade hair clips with pearlescent resin and subtle shimmer.", 22],
  ["Rose Quartz Resin Sculpture", "A faceted decorative sculpture in blush pink and translucent resin.", 55],
  ["Minimalist Resin Candle Holder", "A modern candle holder with a smooth, marbled resin finish.", 37],
  ["Ocean Blue Resin Wall Clock", "A statement wall clock with flowing ocean-blue resin artwork.", 125],
  ["Golden Sand Resin Trinket Tray", "A shallow tray with warm sand tones and fine metallic resin accents.", 33],
  ["Color Burst Resin Art Panel", "A bold, handmade abstract panel with bright layered resin pigments.", 150],
];

function createCatalogProducts(
  category: ProductCategory,
  entries: readonly CatalogEntry[]
): CatalogProduct[] {
  return entries.map(([name, description, priceUsd]) => ({
    name,
    description,
    priceUsd,
    category,
    slug: `${category.toLowerCase()}-${name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")}`,
  }));
}

const additionalProducts: readonly CatalogProduct[] = [
  ...createCatalogProducts(
    ProductCategory.FRAGRANCE_OILS,
    fragranceOilEntries
  ),
  ...createCatalogProducts(
    ProductCategory.SCENTED_CANDLES,
    scentedCandleEntries
  ),
  ...createCatalogProducts(
    ProductCategory.RESIN_ART,
    resinArtEntries
  ),
];

type OpenverseImage = {
  title: string;
  url: string;
  creator: string;
  license: string;
  license_version: string;
  license_url: string;
  foreign_landing_url: string;
};

type CatalogImageProduct = CatalogProduct & { imageUrl: string };

function isOpenverseImage(value: unknown): value is OpenverseImage {
  return (
    typeof value === "object" &&
    value !== null &&
    "title" in value &&
    typeof value.title === "string" &&
    "url" in value &&
    typeof value.url === "string" &&
    value.url.startsWith("https://") &&
    "creator" in value &&
    typeof value.creator === "string" &&
    "license" in value &&
    typeof value.license === "string" &&
    "license_version" in value &&
    typeof value.license_version === "string" &&
    "license_url" in value &&
    typeof value.license_url === "string" &&
    "foreign_landing_url" in value &&
    typeof value.foreign_landing_url === "string"
  );
}

async function fetchOpenverseImages(query: string): Promise<OpenverseImage[]> {
  const url = new URL("https://api.openverse.org/v1/images/");
  url.searchParams.set("q", query);
  url.searchParams.set("page_size", "20");
  url.searchParams.set("license", "cc0,by,by-sa");

  const response = await fetch(url, {
    signal: AbortSignal.timeout(20_000),
    headers: { "User-Agent": "MyShopProductCatalog/1.0" },
  });
  if (!response.ok) {
    throw new Error(
        `Image search failed for "${query}" (${response.status}).`
    );
  }

  const payload: unknown = await response.json();
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("results" in payload) ||
    !Array.isArray(payload.results) ||
    !payload.results.every(isOpenverseImage)
  ) {
    throw new Error(`Image search returned invalid results for "${query}".`);
  }
  return payload.results;
}

async function fetchUniqueImages(
  querySets: readonly (readonly string[])[],
  requiredCount: number,
  usedUrls: Set<string>
): Promise<OpenverseImage[]> {
  const images: OpenverseImage[] = [];

  for (const query of querySets.flat()) {
    for (const image of await fetchOpenverseImages(query)) {
        if (!usedUrls.has(image.url)) {
          usedUrls.add(image.url);
          images.push(image);
          if (images.length === requiredCount) {
            return images;
          }
        }
    }
  }

  throw new Error(
    `Found only ${images.length} unique images; ${requiredCount} are required.`
  );
}

function attachUniqueImages(
  products: readonly CatalogProduct[],
  images: readonly OpenverseImage[]
): CatalogImageProduct[] {
  if (products.length !== images.length) {
    throw new Error("Product and image counts do not match.");
  }

  return products.map((product, index) => {
    const image = images[index];
    if (!image) {
        throw new Error(`Missing image for product "${product.name}".`);
    }

    const attribution =
        image.license.toLowerCase() === "cc0"
          ? `Image: "${image.title}" by ${image.creator} (CC0), ${image.foreign_landing_url}`
          : `Image: "${image.title}" by ${image.creator}, CC ${image.license.toUpperCase()} ${image.license_version}, ${image.license_url}; source: ${image.foreign_landing_url}`;

    return {
        ...product,
        description: `${product.description}\n\n${attribution}`,
        imageUrl: image.url,
    };
  });
}

function hasInrRate(
  value: unknown
): value is { rates: { INR: number } } {
  return (
    typeof value === "object" &&
    value !== null &&
    "rates" in value &&
    typeof value.rates === "object" &&
    value.rates !== null &&
    "INR" in value.rates &&
    typeof value.rates.INR === "number" &&
    Number.isFinite(value.rates.INR) &&
    value.rates.INR > 0
  );
}

async function main() {
  try {
    const rateResponse = await fetch(
      "https://api.frankfurter.app/latest?from=USD&to=INR",
      { signal: AbortSignal.timeout(10_000), cache: "no-store" }
    );
    if (!rateResponse.ok) {
      throw new Error(`Unable to retrieve USD/INR exchange rate (${rateResponse.status}).`);
    }

    const rateData: unknown = await rateResponse.json();
    if (!hasInrRate(rateData)) {
      throw new Error("The USD/INR exchange-rate response was invalid.");
    }

    const allCatalogProducts: CatalogProduct[] = [
      ...jewelleryProducts.map((product) => ({
        name: product.name,
        slug: `jewellery-${product.slug}`,
        description: product.description,
        priceUsd: product.priceUsd,
        category: ProductCategory.JEWELLERY,
      })),
      ...additionalProducts,
    ];
    const productNames = allCatalogProducts.map((product) =>
      product.name.trim().toLowerCase()
    );
    const productSlugs = allCatalogProducts.map((product) => product.slug);
    if (
      new Set(productNames).size !== allCatalogProducts.length ||
      new Set(productSlugs).size !== allCatalogProducts.length
    ) {
      throw new Error("Catalog product names and slugs must be unique.");
    }

    const usedImageUrls = new Set<string>();
    const jewelleryImages = await fetchUniqueImages(
      [["jewelry ring necklace earrings bracelet", "diamond ring necklace jewelry", "handmade jewelry necklace earrings"]],
      jewelleryProducts.length,
      usedImageUrls
    );
    const fragranceImages = await fetchUniqueImages(
      [["perfume oil", "essential oil bottle", "perfume bottles"]],
      fragranceOilEntries.length,
      usedImageUrls
    );
    const candleImages = await fetchUniqueImages(
      [["scented candle", "soy candle", "candle jar"]],
      scentedCandleEntries.length,
      usedImageUrls
    );
    const resinImages = await fetchUniqueImages(
      [["resin coaster", "epoxy resin", "epoxy art"]],
      resinArtEntries.length,
      usedImageUrls
    );
    const jewelleryProductsWithImages = attachUniqueImages(
      allCatalogProducts.filter(
        (product) => product.category === ProductCategory.JEWELLERY
      ),
      jewelleryImages
    );
    const catalogProductsWithImages = [
      ...attachUniqueImages(
        additionalProducts.filter(
          (product) => product.category === ProductCategory.FRAGRANCE_OILS
        ),
        fragranceImages
      ),
      ...attachUniqueImages(
        additionalProducts.filter(
          (product) => product.category === ProductCategory.SCENTED_CANDLES
        ),
        candleImages
      ),
      ...attachUniqueImages(
        additionalProducts.filter(
          (product) => product.category === ProductCategory.RESIN_ART
        ),
        resinImages
      ),
    ];

    const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const productsToCreate: Prisma.ProductCreateManyInput[] = [
      ...jewelleryProductsWithImages.map((product) => ({
        name: product.name,
        slug: `${product.slug}-${runId}`,
        description: product.description,
        price: Math.round(product.priceUsd * rateData.rates.INR * 100) / 100,
        stock: 10,
        category: product.category,
        imageUrl: product.imageUrl,
      })),
      ...catalogProductsWithImages.map((product) => ({
        name: product.name,
        slug: `${product.slug}-${runId}`,
        description: product.description,
        price: Math.round(product.priceUsd * rateData.rates.INR * 100) / 100,
        stock: 10,
        category: product.category,
        imageUrl: product.imageUrl,
      })),
    ];

    const allSlugs = productsToCreate.map((product) => product.slug);
    const allImageUrls = productsToCreate.map((product) => product.imageUrl);
    if (
      new Set(allSlugs).size !== productsToCreate.length ||
      new Set(allImageUrls).size !== productsToCreate.length
    ) {
      throw new Error("Every product must have a unique slug and image URL.");
    }

    const result = await prisma.product.createMany({
      data: productsToCreate,
      skipDuplicates: true,
    });
    console.log(
      `Created ${result.count} products with unique run-specific slugs.`
    );
  } catch (error) {
    console.error("Failed to create products:", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

void main();
