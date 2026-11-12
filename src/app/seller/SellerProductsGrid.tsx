import { formatINR } from "@/lib/currency";

export type SellerProduct = {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  imageUrl?: string | null;
};

export default function SellerProductsGrid({
  products,
  dark = false,
}: {
  products: SellerProduct[];
  dark?: boolean;
}) {
  if (products.length === 0) {
    return (
      <div
        className={`rounded-2xl border px-6 py-10 text-center shadow-sm ${
          dark
            ? "border-white/10 bg-slate-900/70 text-slate-100"
            : "border-slate-200 bg-white text-slate-900"
        }`}
      >
        <h2 className="font-semibold">
          {dark ? "No products available" : "No products assigned"}
        </h2>
        <p className={`mt-2 text-sm ${dark ? "text-slate-300" : "text-slate-600"}`}>
          {dark
            ? "There are no in-stock products to display."
            : "Select products to add them to your seller account."}
        </p>
      </div>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {products.map((product) => (
        <li
          className={`flex h-full flex-col rounded-[14px] border p-[22px] shadow-[0_12px_30px_rgba(0,0,0,0.22)] transition duration-200 hover:-translate-y-1 ${
            dark
              ? "border-white/10 bg-slate-900/70 text-slate-100 backdrop-blur-md hover:border-sky-300/30"
              : "border-slate-200 bg-white text-slate-900 shadow-sm hover:shadow-md"
          }`}
          key={product.id}
        >
          <div
            aria-label={product.imageUrl ? product.name : undefined}
            className={`mb-4 h-40 shrink-0 rounded-xl border ${
              dark
                ? "border-white/10 bg-gradient-to-br from-blue-950 via-slate-800 to-indigo-950"
                : "border-slate-200 bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100"
            } bg-cover bg-center`}
            role={product.imageUrl ? "img" : undefined}
            style={
              product.imageUrl
                ? {
                    backgroundImage: `url("${product.imageUrl.replaceAll('"', "%22")}")`,
                  }
                : undefined
            }
          />
          <p className={`text-xs font-semibold uppercase tracking-wide ${dark ? "text-sky-300" : "text-indigo-600"}`}>
            {product.category.replaceAll("_", " ")}
          </p>
          <h2 className={`mt-2 line-clamp-2 min-h-14 text-xl font-semibold ${dark ? "text-slate-100" : "text-slate-900"}`}>
            {product.name}
          </h2>
          <p className={`mt-2 line-clamp-3 min-h-[4.5rem] flex-1 text-sm ${dark ? "text-slate-300" : "text-slate-600"}`}>
            {product.description}
          </p>
          <dl className={`mt-4 grid grid-cols-2 gap-3 border-t pt-4 text-sm ${dark ? "border-white/10" : "border-slate-100"}`}>
            <div>
              <dt className={dark ? "text-slate-400" : "text-slate-500"}>Price</dt>
              <dd className={`mt-1 font-semibold ${dark ? "text-sky-300" : "text-slate-900"}`}>
                {formatINR(product.price)}
              </dd>
            </div>
            <div>
              <dt className={dark ? "text-slate-400" : "text-slate-500"}>Stock</dt>
              <dd className={`mt-1 font-semibold ${dark ? "text-slate-100" : "text-slate-900"}`}>
                {product.stock}
              </dd>
            </div>
          </dl>
        </li>
      ))}
    </ul>
  );
}
