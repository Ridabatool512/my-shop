import { cacheLife } from "next/cache";

type ExchangeRateResponse = {
  rates?: {
    USD?: number;
  };
};

const FALLBACK_INR_TO_USD_RATE = 0.012;

export async function getInrToUsdRate(): Promise<number> {
  "use cache";
  cacheLife("hours");

  try {
    const response = await fetch(
      "https://api.frankfurter.app/latest?from=INR&to=USD",
      { signal: AbortSignal.timeout(10_000) }
    );

    if (!response.ok) {
      throw new Error(
        `Unable to retrieve the latest INR/USD rate (${response.status}).`
      );
    }

    const data = (await response.json()) as ExchangeRateResponse;
    const rate = data.rates?.USD;

    if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) {
      throw new Error(
        "The exchange-rate response did not contain a valid USD rate."
      );
    }

    return rate;
  } catch (error) {
    console.error(
      "INR/USD exchange-rate request failed; using the configured fallback rate.",
      error
    );
    return FALLBACK_INR_TO_USD_RATE;
  }
}
