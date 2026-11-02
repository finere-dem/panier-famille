// Demo catalog: fictional merchants in Bamako. Prices are in USD because the PayPal
// Agent Toolkit's create_order only accepts USD. No real brand or shop is used.

export type Merchant = {
  id: string;
  name: string;
  kind: string;
  neighborhood: string;
};

export type Product = {
  id: string;
  merchantId: string;
  name: string;
  category: "staples" | "cooking" | "hygiene" | "baby" | "health" | "energy";
  unit: string;
  priceUsd: number;
};

export const merchants: Merchant[] = [
  { id: "m-awa", name: "Boutique Awa", kind: "Grocery", neighborhood: "Hamdallaye ACI" },
  { id: "m-sanou", name: "Marché Sanou", kind: "Market stall", neighborhood: "Médina Coura" },
  { id: "m-djoliba", name: "Pharmacie du Djoliba", kind: "Pharmacy", neighborhood: "Badalabougou" },
  { id: "m-kaba", name: "Kaba Énergie", kind: "Gas & electricity", neighborhood: "Kalaban Coura" },
];

export const products: Product[] = [
  { id: "p-rice-25", merchantId: "m-awa", name: "Rice", category: "staples", unit: "25 kg bag", priceUsd: 22 },
  { id: "p-millet-10", merchantId: "m-sanou", name: "Millet", category: "staples", unit: "10 kg bag", priceUsd: 9 },
  { id: "p-maize-10", merchantId: "m-sanou", name: "Maize flour", category: "staples", unit: "10 kg bag", priceUsd: 8 },
  { id: "p-sugar-5", merchantId: "m-awa", name: "Sugar", category: "staples", unit: "5 kg", priceUsd: 6 },
  { id: "p-oil-5", merchantId: "m-awa", name: "Cooking oil", category: "cooking", unit: "5 L", priceUsd: 12 },
  { id: "p-onions-5", merchantId: "m-sanou", name: "Onions", category: "cooking", unit: "5 kg", priceUsd: 4 },
  { id: "p-tomato-paste", merchantId: "m-awa", name: "Tomato paste", category: "cooking", unit: "box of 12", priceUsd: 5 },
  { id: "p-shea-butter", merchantId: "m-sanou", name: "Shea butter", category: "cooking", unit: "1 kg", priceUsd: 4 },
  { id: "p-milk-powder", merchantId: "m-awa", name: "Powdered milk", category: "baby", unit: "2.5 kg", priceUsd: 15 },
  { id: "p-diapers", merchantId: "m-awa", name: "Baby diapers", category: "baby", unit: "pack of 60", priceUsd: 11 },
  { id: "p-soap", merchantId: "m-awa", name: "Laundry and bath soap", category: "hygiene", unit: "pack of 10", priceUsd: 5 },
  { id: "p-toothpaste", merchantId: "m-awa", name: "Toothpaste and brushes", category: "hygiene", unit: "family kit", priceUsd: 4 },
  { id: "p-pharmacy-voucher", merchantId: "m-djoliba", name: "Pharmacy voucher (redeemed by the pharmacist against the recipient's own prescription)", category: "health", unit: "$20 credit", priceUsd: 20 },
  { id: "p-paracetamol", merchantId: "m-djoliba", name: "Paracetamol 500 mg", category: "health", unit: "box of 20", priceUsd: 2 },
  { id: "p-ors", merchantId: "m-djoliba", name: "Oral rehydration salts", category: "health", unit: "10 sachets", priceUsd: 3 },
  { id: "p-mosquito-net", merchantId: "m-djoliba", name: "Treated mosquito net", category: "health", unit: "1 net", priceUsd: 7 },
  { id: "p-gas-refill", merchantId: "m-kaba", name: "Cooking gas refill", category: "energy", unit: "12 kg bottle", priceUsd: 14 },
  { id: "p-power-credit", merchantId: "m-kaba", name: "Prepaid electricity credit", category: "energy", unit: "$10 credit", priceUsd: 10 },
];

export function findProduct(id: string) {
  return products.find((p) => p.id === id);
}

export function findMerchant(id: string) {
  return merchants.find((m) => m.id === id);
}
