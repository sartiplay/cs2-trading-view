// Currency conversion service using exchangerate-api.com (free tier)
const EXCHANGE_API_URL = "https://api.exchangerate-api.com/v4/latest";

export interface ExchangeRates {
  base: string;
  rates: Record<string, number>;
}

export const SUPPORTED_CURRENCIES = [
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
  { code: "SEK", name: "Swedish Krona", symbol: "kr" },
  { code: "NOK", name: "Norwegian Krone", symbol: "kr" },
  { code: "DKK", name: "Danish Krone", symbol: "kr" },
  { code: "PLN", name: "Polish Zloty", symbol: "zł" },
  { code: "CZK", name: "Czech Koruna", symbol: "Kč" },
  { code: "HUF", name: "Hungarian Forint", symbol: "Ft" },
  { code: "RUB", name: "Russian Ruble", symbol: "₽" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$" },
  { code: "MXN", name: "Mexican Peso", symbol: "$" },
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "KRW", name: "South Korean Won", symbol: "₩" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$" },
];

let cachedRates: ExchangeRates | null = null;
let lastFetch = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

export async function getExchangeRates(): Promise<ExchangeRates> {
  const now = Date.now();

  // Return cached rates if still valid
  if (cachedRates && now - lastFetch < CACHE_DURATION) {
    return cachedRates;
  }

  try {
    console.log("[Currency] Fetching latest exchange rates...");
    const response = await fetch(`${EXCHANGE_API_URL}/USD`, {
      headers: {
        "User-Agent": "CS2-Price-Tracker/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    cachedRates = data;
    lastFetch = now;

    console.log("[Currency] Exchange rates updated successfully");
    return data;
  } catch (error) {
    console.error("[Currency] Failed to fetch exchange rates:", error);

    // Return cached rates if available, otherwise use fallback
    if (cachedRates) {
      console.log("[Currency] Using cached exchange rates");
      return cachedRates;
    }

    // Fallback rates (approximate)
    console.log("[Currency] Using fallback exchange rates");
    return {
      base: "USD",
      rates: {
        USD: 1,
        EUR: 0.85,
        GBP: 0.73,
        JPY: 110,
        CAD: 1.25,
        AUD: 1.35,
        CHF: 0.92,
        CNY: 6.45,
        SEK: 8.5,
        NOK: 8.8,
        DKK: 6.3,
        PLN: 3.9,
        CZK: 21.5,
        HUF: 295,
        RUB: 75,
        BRL: 5.2,
        MXN: 20,
        INR: 74,
        KRW: 1180,
        SGD: 1.35,
      },
    };
  }
}

export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency = "USD"
): Promise<number> {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  const rates = await getExchangeRates();

  // Convert from source currency to USD first
  const usdAmount =
    fromCurrency === "USD" ? amount : amount / rates.rates[fromCurrency];

  // Then convert from USD to target currency
  const convertedAmount =
    toCurrency === "USD" ? usdAmount : usdAmount * rates.rates[toCurrency];

  return convertedAmount;
}

export function getCurrencySymbol(currencyCode: string): string {
  const currency = SUPPORTED_CURRENCIES.find((c) => c.code === currencyCode);
  return currency?.symbol || currencyCode;
}

export function formatCurrency(amount: number, currencyCode: string): string {
  const symbol = getCurrencySymbol(currencyCode);
  return `${symbol}${amount.toFixed(2)}`;
}
