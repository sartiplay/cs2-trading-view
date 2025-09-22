export interface TradeProviderMeta {
  id: string;
  name: string;
  baseUrl: string;
  accentColor: string;
  envKey: string;
}

export const TRADE_PROVIDERS: TradeProviderMeta[] = [
  {
    id: "cs.money",
    name: "CS.MONEY",
    baseUrl: "https://cs.money/csgo",
    accentColor: "bg-blue-500",
    envKey: "CSMONEY_API_KEY",
  },
  {
    id: "skinsmonkey",
    name: "SkinsMonkey",
    baseUrl: "https://skinsmonkey.com",
    accentColor: "bg-purple-500",
    envKey: "SKINSMONKEY_API_KEY",
  },
  {
    id: "csfloat",
    name: "CSFloat",
    baseUrl: "https://csfloat.com",
    accentColor: "bg-green-500",
    envKey: "CSFLOAT_API_KEY",
  },
  {
    id: "skinport",
    name: "Skinport",
    baseUrl: "https://skinport.com",
    accentColor: "bg-amber-500",
    envKey: "SKINPORT_API_KEY",
  },
  {
    id: "skinbid",
    name: "Skinbid",
    baseUrl: "https://skinbid.com",
    accentColor: "bg-rose-500",
    envKey: "SKINBID_API_KEY",
  },
  {
    id: "tradeit",
    name: "TradeIt",
    baseUrl: "https://tradeit.gg",
    accentColor: "bg-sky-500",
    envKey: "TRADEIT_API_KEY",
  },
];

export const DEFAULT_PINNED_PROVIDERS = [
  TRADE_PROVIDERS[0].name,
  TRADE_PROVIDERS[1].name,
  TRADE_PROVIDERS[2].name,
];
