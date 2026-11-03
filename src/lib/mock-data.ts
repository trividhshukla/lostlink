import { CampusArea } from "./constants";

export interface ReportItem {
  id: string;
  type: "lost" | "found";
  title: string;
  description: string;
  category: string;
  categorySlug: string;
  colour: string;
  brand?: string;
  distinctiveFeatures?: string;
  campusArea: CampusArea;
  exactLocationNote?: string;
  incidentDate: string; // ISO 8601 timestamp string
  status: "active" | "claim_accepted" | "resolved" | "closed";
  photoUrl?: string; // ONLY for found reports
  isRestrictedCategory?: boolean;
}

export const MOCK_REPORTS: ReportItem[] = [
  {
    id: "rep-001",
    type: "found",
    title: "Graphite Anker 20,000mAh Power Bank with Braided Cable",
    description: "Found plugged into wall socket next to lecture hall 102. Anker branding on front face, dark braided nylon USB-C to USB-C cable left connected.",
    category: "Chargers and cables",
    categorySlug: "chargers-cables",
    colour: "Grey",
    brand: "Anker",
    distinctiveFeatures: "Dark grey braided USB-C cable attached, 4 LED charge indicator",
    campusArea: "BLOCK A",
    exactLocationNote: "Lecture Hall 102, back row right power outlet",
    incidentDate: "2026-10-29T15:30:00.000Z",
    status: "active",
    photoUrl: "https://images.unsplash.com/photo-1564286026180-dac17255aee1?w=800&q=80",
    isRestrictedCategory: false,
  },
  {
    id: "rep-002",
    type: "lost",
    title: "Cobalt Blue Hydro Flask 32oz Bottle",
    description: "Lost during evening basketball practice near the western court bleachers. Has a reflective Yosemite National Park sticker and slight dent near the base.",
    category: "Water bottles and lunch boxes",
    categorySlug: "bottles-boxes",
    colour: "Blue",
    brand: "Hydro Flask",
    distinctiveFeatures: "Yosemite mountain sticker, slight dent at bottom rim",
    campusArea: "Sports Ground",
    exactLocationNote: "West basketball court bleachers",
    incidentDate: "2026-10-30T16:15:00.000Z",
    status: "active",
    // No photoUrl for lost reports!
    isRestrictedCategory: false,
  },
  {
    id: "rep-003",
    type: "found",
    title: "Student Identity Card & Library Pass",
    description: "Found resting near the checkout counter in the central canteen. Card is enclosed in a transparent plastic lanyard sleeve.",
    category: "ID cards and documents",
    categorySlug: "id-cards-documents",
    colour: "White",
    brand: "Campus Issued",
    distinctiveFeatures: "Blue striped campus lanyard attached",
    campusArea: "Canteen",
    exactLocationNote: "Billing counter 2 near food court",
    incidentDate: "2026-10-30T13:15:00.000Z",
    status: "active",
    // Restricted photo! Marked as restricted
    isRestrictedCategory: true,
  },
  {
    id: "rep-004",
    type: "found",
    title: "Silver Apple MacBook Air 13-inch (M2)",
    description: "Left behind on bench 4 in the electronics lab. Has a clear hardshell protective casing with a subtle dark logo skin.",
    category: "Laptops and computers",
    categorySlug: "laptops-computers",
    colour: "Silver",
    brand: "Apple",
    distinctiveFeatures: "Clear speck case, subtle developer sticker on trackpad edge",
    campusArea: "BLOCK B",
    exactLocationNote: "Block B, Electronics Lab 204",
    incidentDate: "2026-10-30T14:00:00.000Z",
    status: "active",
    photoUrl: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80",
    isRestrictedCategory: false,
  },
  {
    id: "rep-005",
    type: "lost",
    title: "Matte Black Casio G-Shock Tough Solar Watch",
    description: "Lost after gym session. Resin strap with dark buckle. The bezel has small wear markings on the top left 'Adjust' button.",
    category: "Jewelry and watches",
    categorySlug: "jewelry-watches",
    colour: "Black",
    brand: "Casio",
    distinctiveFeatures: "Wear mark near top-left Adjust button, invert digital display",
    campusArea: "CDE Ground",
    exactLocationNote: "Changing room bench area",
    incidentDate: "2026-10-29T10:45:00.000Z",
    status: "active",
    // No photo for lost!
    isRestrictedCategory: false,
  },
  {
    id: "rep-006",
    type: "found",
    title: "Sony WH-1000XM4 Wireless Headphones in Black Case",
    description: "Found on the 2nd floor silent study table in the library. In original black zip case with audio cable inside. Left ear cup has a tiny white scuff mark.",
    category: "Headphones and earbuds",
    categorySlug: "headphones-earbuds",
    colour: "Black",
    brand: "Sony",
    distinctiveFeatures: "Small white scuff on left ear cup; contains aux cable in mesh pocket",
    campusArea: "Library",
    exactLocationNote: "2nd Floor, Silent Study Area near shelf 14",
    incidentDate: "2026-10-31T11:30:00.000Z",
    status: "active",
    photoUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80",
    isRestrictedCategory: false,
  },
  {
    id: "rep-007",
    type: "lost",
    title: "Navy Blue JanSport SuperBreak Backpack",
    description: "Forgot near the seating circular fountain benches while discussing an assignment. Contains lecture notebooks and engineering stationery.",
    category: "Bags and backpacks",
    categorySlug: "bags-backpacks",
    colour: "Blue",
    brand: "JanSport",
    distinctiveFeatures: "Brass carabiner on front daisy chain with a rubber robot keychain",
    campusArea: "Fountain",
    exactLocationNote: "South stone bench by the water feature",
    incidentDate: "2026-10-28T17:10:00.000Z",
    status: "claim_accepted",
    isRestrictedCategory: false,
  },
  {
    id: "rep-008",
    type: "found",
    title: "Tortoiseshell Eyeglasses in Brown Leather Case",
    description: "Found on seminar room table. Rounded acetate frames with spring hinges in a worn tan leather snap case.",
    category: "Glasses and sunglasses",
    categorySlug: "glasses-sunglasses",
    colour: "Brown",
    brand: "Ray-Ban",
    distinctiveFeatures: "Tortoiseshell pattern with golden temple accents",
    campusArea: "BLOCK D",
    exactLocationNote: "Seminar Room 301",
    incidentDate: "2026-10-27T16:00:00.000Z",
    status: "resolved",
    photoUrl: "https://images.unsplash.com/photo-1591076482161-42ce6da69f67?w=800&q=80",
    isRestrictedCategory: false,
  },
];
