import type { Period } from "@/types/analysis";

export const SECTORS = [
  "Banking",
  "IT",
  "Auto",
  "Pharma",
  "Energy",
  "FMCG",
  "Metal",
  "Realty",
  "Infrastructure",
  "Media"
] as const;

export type Sector = (typeof SECTORS)[number];

// Liquid NSE candidates per sector. The Sector Selector picks its 3 stocks from these, using
// prices and indicators computed from Yahoo Finance (symbol + ".NS").
export const SECTOR_STOCKS: Record<Sector, Array<{ name: string; symbol: string }>> = {
  Banking: [
    { name: "HDFC Bank", symbol: "HDFCBANK" },
    { name: "ICICI Bank", symbol: "ICICIBANK" },
    { name: "State Bank of India", symbol: "SBIN" },
    { name: "Kotak Mahindra Bank", symbol: "KOTAKBANK" },
    { name: "Axis Bank", symbol: "AXISBANK" },
    { name: "IndusInd Bank", symbol: "INDUSINDBK" }
  ],
  IT: [
    { name: "Tata Consultancy Services", symbol: "TCS" },
    { name: "Infosys", symbol: "INFY" },
    { name: "HCL Technologies", symbol: "HCLTECH" },
    { name: "Wipro", symbol: "WIPRO" },
    { name: "Tech Mahindra", symbol: "TECHM" },
    { name: "Persistent Systems", symbol: "PERSISTENT" }
  ],
  Auto: [
    { name: "Maruti Suzuki", symbol: "MARUTI" },
    { name: "Mahindra & Mahindra", symbol: "M&M" },
    { name: "Bajaj Auto", symbol: "BAJAJ-AUTO" },
    { name: "Eicher Motors", symbol: "EICHERMOT" },
    { name: "Hero MotoCorp", symbol: "HEROMOTOCO" },
    { name: "TVS Motor", symbol: "TVSMOTOR" }
  ],
  Pharma: [
    { name: "Sun Pharma", symbol: "SUNPHARMA" },
    { name: "Cipla", symbol: "CIPLA" },
    { name: "Dr. Reddy's Laboratories", symbol: "DRREDDY" },
    { name: "Divi's Laboratories", symbol: "DIVISLAB" },
    { name: "Lupin", symbol: "LUPIN" },
    { name: "Aurobindo Pharma", symbol: "AUROPHARMA" }
  ],
  Energy: [
    { name: "Reliance Industries", symbol: "RELIANCE" },
    { name: "ONGC", symbol: "ONGC" },
    { name: "NTPC", symbol: "NTPC" },
    { name: "Power Grid", symbol: "POWERGRID" },
    { name: "BPCL", symbol: "BPCL" },
    { name: "Indian Oil", symbol: "IOC" }
  ],
  FMCG: [
    { name: "Hindustan Unilever", symbol: "HINDUNILVR" },
    { name: "ITC", symbol: "ITC" },
    { name: "Nestle India", symbol: "NESTLEIND" },
    { name: "Britannia", symbol: "BRITANNIA" },
    { name: "Dabur", symbol: "DABUR" },
    { name: "Tata Consumer Products", symbol: "TATACONSUM" }
  ],
  Metal: [
    { name: "Tata Steel", symbol: "TATASTEEL" },
    { name: "JSW Steel", symbol: "JSWSTEEL" },
    { name: "Hindalco", symbol: "HINDALCO" },
    { name: "Vedanta", symbol: "VEDL" },
    { name: "SAIL", symbol: "SAIL" },
    { name: "NMDC", symbol: "NMDC" }
  ],
  Realty: [
    { name: "DLF", symbol: "DLF" },
    { name: "Godrej Properties", symbol: "GODREJPROP" },
    { name: "Oberoi Realty", symbol: "OBEROIRLTY" },
    { name: "Prestige Estates", symbol: "PRESTIGE" },
    { name: "Lodha (Macrotech Developers)", symbol: "LODHA" },
    { name: "Phoenix Mills", symbol: "PHOENIXLTD" }
  ],
  Infrastructure: [
    { name: "Larsen & Toubro", symbol: "LT" },
    { name: "Adani Ports", symbol: "ADANIPORTS" },
    { name: "UltraTech Cement", symbol: "ULTRACEMCO" },
    { name: "Grasim Industries", symbol: "GRASIM" },
    { name: "BHEL", symbol: "BHEL" },
    { name: "Ambuja Cements", symbol: "AMBUJACEM" }
  ],
  Media: [
    { name: "Zee Entertainment", symbol: "ZEEL" },
    { name: "Sun TV Network", symbol: "SUNTV" },
    { name: "PVR INOX", symbol: "PVRINOX" },
    { name: "Network18", symbol: "NETWORK18" },
    { name: "Nazara Technologies", symbol: "NAZARA" },
    { name: "Saregama", symbol: "SAREGAMA" }
  ]
};

export const PERIOD_OPTIONS: Array<{ label: string; value: Period }> = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Half-Yearly", value: "half_yearly" },
  { label: "Yearly", value: "yearly" }
];
