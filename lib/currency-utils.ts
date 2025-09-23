import { getCurrencySymbol } from "./currency-converter.server";

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

export const CURRENCY_SYMBOLS: Record<string, string> = SUPPORTED_CURRENCIES.reduce(
  (acc, currency) => {
    acc[currency.code] = currency.symbol;
    return acc;
  },
  {} as Record<string, string>
);

export function getClientCurrencySymbol(currencyCode: string): string {
  return CURRENCY_SYMBOLS[currencyCode] || currencyCode;
}

export function formatCurrency(amount: number, currencyCode: string): string {
  const symbol = getClientCurrencySymbol(currencyCode);
  return `${symbol}${amount.toFixed(2)}`;
}

export function formatCurrencyWithCode(amount: number, currencyCode: string): string {
  const symbol = getClientCurrencySymbol(currencyCode);
  return `${symbol}${amount.toFixed(2)} ${currencyCode}`;
}
