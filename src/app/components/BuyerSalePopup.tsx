"use client";

import Link from "next/link";
import { useState } from "react";

export default function BuyerSalePopup() {
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="sale-popup-backdrop">
      <section
        aria-labelledby="sale-popup-title"
        aria-modal="true"
        className="sale-popup-card px-8 py-12 text-center sm:px-12 sm:py-14"
        role="dialog"
      >
        <button
          aria-label="Close sale offer"
          className="sale-popup-close"
          onClick={() => setIsOpen(false)}
          type="button"
        >
          ×
        </button>
        <p className="mb-3 text-sm font-extrabold uppercase tracking-[0.22em] text-white/85">
          Limited-time offer
        </p>
        <h2
          className="mx-auto max-w-sm text-4xl font-black leading-tight drop-shadow sm:text-5xl"
          id="sale-popup-title"
        >
          Bundle Deals - Extra 20% off
        </h2>
        <p className="mx-auto mt-4 max-w-sm text-base font-medium text-white/90">
          Find your favorites and save more when you shop together.
        </p>
        <Link
          className="sale-popup-shop mt-8 min-w-48 text-lg"
          href="/#products"
          onClick={() => setIsOpen(false)}
        >
          Shop now
        </Link>
      </section>
    </div>
  );
}
