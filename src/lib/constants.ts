export interface CategoryDefinition {
  label: string;
  slug: string;
  group: string;
  photoVisibility: "public" | "restricted";
  description?: string;
}

export const CATEGORIES: CategoryDefinition[] = [
  { label: "Phones and tablets", slug: "phones-tablets", group: "electronics", photoVisibility: "public" },
  { label: "Laptops and computers", slug: "laptops-computers", group: "electronics", photoVisibility: "public" },
  { label: "Headphones and earbuds", slug: "headphones-earbuds", group: "electronics", photoVisibility: "public" },
  { label: "Chargers and cables", slug: "chargers-cables", group: "electronics", photoVisibility: "public" },
  { label: "Other electronics", slug: "other-electronics", group: "electronics", photoVisibility: "public" },
  { label: "Bags and backpacks", slug: "bags-backpacks", group: "carry", photoVisibility: "public" },
  { label: "Wallets and purses", slug: "wallets-purses", group: "carry", photoVisibility: "public" },
  {
    label: "ID cards and documents",
    slug: "id-cards-documents",
    group: "documents",
    photoVisibility: "restricted",
    description: "Restricted photo category. Sensitive documents are protected with privacy placeholders.",
  },
  { label: "Keys and key cards", slug: "keys-key-cards", group: "keys", photoVisibility: "public" },
  { label: "Water bottles and lunch boxes", slug: "bottles-boxes", group: "everyday", photoVisibility: "public" },
  { label: "Books and stationery", slug: "books-stationery", group: "study", photoVisibility: "public" },
  { label: "Clothing and accessories", slug: "clothing-accessories", group: "clothing", photoVisibility: "public" },
  { label: "Jewelry and watches", slug: "jewelry-watches", group: "accessories", photoVisibility: "public" },
  { label: "Glasses and sunglasses", slug: "glasses-sunglasses", group: "accessories", photoVisibility: "public" },
  { label: "Sports equipment", slug: "sports-equipment", group: "sports", photoVisibility: "public" },
  { label: "Umbrellas", slug: "umbrellas", group: "everyday", photoVisibility: "public" },
  { label: "Other", slug: "other", group: "other", photoVisibility: "public" },
];

export const CAMPUS_AREAS = [
  "BLOCK A",
  "BLOCK B",
  "BLOCK C",
  "BLOCK D",
  "BLOCK E",
  "Library",
  "Sports Ground",
  "Canteen",
  "Main Gate",
  "CDE Ground",
  "Fountain",
  "Other",
] as const;

export type CampusArea = (typeof CAMPUS_AREAS)[number];

export const REPORT_COLOURS = [
  "Black",
  "White",
  "Grey",
  "Silver",
  "Gold",
  "Brown",
  "Beige",
  "Red",
  "Pink",
  "Orange",
  "Yellow",
  "Green",
  "Blue",
  "Purple",
  "Multicolor",
  "Transparent",
  "Other",
  "Not sure",
] as const;

export type ReportColour = (typeof REPORT_COLOURS)[number];
