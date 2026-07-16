export type TourPackage = {
  id: string;
  title: string;
  minPax: number;
  maxPax: number;
  /** Max guests that can book this package on a single date */
  slotsAvailable: number;
  /** Trip length */
  days: number;
  nights: number;
  destinations: string[];
  /** Hotels / lodging included or recommended */
  accommodation: string[];
  inclusions: string[];
  inclusionsNote: string;
  exclusions: string[];
  exclusionsNote: string;
  /**
   * Per-person rates in PHP.
   * Index 0 = minPax, last index = maxPax.
   */
  ratesPerPax: number[];
};

export type DestinationSlide = {
  id: string;
  place: string;
  island: "Cebu" | "Bohol";
  image: string;
  alt: string;
  credit: string;
};

export const destinationSlides: DestinationSlide[] = [
  {
    id: "kawasan",
    place: "Kawasan Falls",
    island: "Cebu",
    image: "/destinations/kawasan.jpg",
    alt: "Turquoise pool and waterfall at Kawasan Falls in Badian, Cebu",
    credit: "Unsplash — Badian, Cebu (photo jCIIInzOm-Y)",
  },
  {
    id: "chocolate-hills",
    place: "Chocolate Hills",
    island: "Bohol",
    image: "/destinations/chocolate-hills.jpg",
    alt: "Dry-season cone hills at Chocolate Hills, Batuan, Bohol",
    credit: "Unsplash — Batuan, Bohol (photo Ac7sWF9ogFA)",
  },
  {
    id: "oslob",
    place: "Oslob Whale Sharks",
    island: "Cebu",
    image: "/destinations/oslob-hq.jpg",
    alt: "Aerial view of a whale shark and bangka boats in Oslob, Cebu",
    credit: "Unsplash — Oslob, Cebu (photo QcHpDs_moFA)",
  },
  {
    id: "alona",
    place: "Alona Beach",
    island: "Bohol",
    image: "/destinations/alona-beach.jpg",
    alt: "White sand beach, palms, and outrigger boats at Alona Beach, Panglao, Bohol",
    credit: "Unsplash — Alona Beach, Panglao (photo hftH7asKD1A)",
  },
];

function withMeta(
  pkg: Omit<TourPackage, "slotsAvailable" | "days" | "nights" | "accommodation"> &
    Partial<
      Pick<TourPackage, "slotsAvailable" | "days" | "nights" | "accommodation">
    >,
): TourPackage {
  return {
    slotsAvailable: pkg.slotsAvailable ?? 10,
    days: pkg.days ?? 1,
    nights: pkg.nights ?? 0,
    accommodation: pkg.accommodation ?? [],
    ...pkg,
  };
}

/** Seed packages (also written to data/packages.json). */
export const seedPackages: TourPackage[] = [
  withMeta({
    id: "simala",
    title: "Simala Tour",
    minPax: 2,
    maxPax: 10,
    slotsAvailable: 10,
    days: 1,
    nights: 0,
    destinations: ["Simala Shrine", "Pasalubong shopping"],
    accommodation: ["Day tour — no overnight stay"],
    inclusions: [
      "Private air-conditioned van",
      "Driver / coordinator",
      "Parking & fuel",
    ],
    inclusionsNote: "Rates are per person and vary by group size.",
    exclusions: ["Meals", "Entrance fees", "Personal expenses"],
    exclusionsNote: "Optional add-ons available upon request.",
    ratesPerPax: [1750, 1250, 960, 840, 750, 690, 630, 610, 590],
  }),
  withMeta({
    id: "oslob-simala",
    title: "Oslob + Simala",
    minPax: 2,
    maxPax: 10,
    slotsAvailable: 10,
    days: 1,
    nights: 0,
    destinations: ["Oslob Whale Shark watching", "Simala Shrine"],
    accommodation: ["Day tour — no overnight stay"],
    inclusions: [
      "Private air-conditioned van",
      "Driver / coordinator",
      "Parking & fuel",
    ],
    inclusionsNote: "Whale shark interaction fees may apply on-site.",
    exclusions: [
      "Meals",
      "Whale shark boat / snorkel fees",
      "Personal expenses",
    ],
    exclusionsNote: "Bring extra cash for optional activities.",
    ratesPerPax: [3250, 2420, 2130, 1950, 1750, 1610, 1570, 1480, 1390],
  }),
  withMeta({
    id: "moalboal",
    title: "Moalboal + Badian",
    minPax: 2,
    maxPax: 10,
    slotsAvailable: 10,
    days: 1,
    nights: 0,
    destinations: ["Moalboal sardine run", "Kawasan Falls / Badian"],
    accommodation: ["Day tour — no overnight stay"],
    inclusions: [
      "Private air-conditioned van",
      "Driver / coordinator",
      "Parking & fuel",
    ],
    inclusionsNote: "Canyoneering is optional and quoted separately.",
    exclusions: ["Meals", "Entrance / activity fees", "Personal expenses"],
    exclusionsNote: "Life jackets and guides may be rented on-site.",
    ratesPerPax: [3250, 2420, 2130, 1950, 1750, 1610, 1570, 1480, 1390],
  }),
  withMeta({
    id: "city-mountain",
    title: "City Mountain Tour",
    minPax: 2,
    maxPax: 10,
    slotsAvailable: 10,
    days: 1,
    nights: 0,
    destinations: [
      "Magellan’s Cross",
      "Temple of Leah",
      "Sirao Garden",
      "Mountain View",
    ],
    accommodation: ["Day tour — no overnight stay"],
    inclusions: [
      "Private air-conditioned van",
      "Driver / coordinator",
      "Parking & fuel",
    ],
    inclusionsNote: "Itinerary order may adjust with traffic and weather.",
    exclusions: ["Meals", "Entrance fees", "Personal expenses"],
    exclusionsNote: "Absolutely no hidden charges on van package rates.",
    ratesPerPax: [2220, 1740, 1420, 1330, 1290, 1260, 1170, 1160, 1040],
  }),
  withMeta({
    id: "all-mountain",
    title: "All Mountain Tour",
    minPax: 2,
    maxPax: 10,
    slotsAvailable: 10,
    days: 1,
    nights: 0,
    destinations: [
      "Temple of Leah",
      "Sirao Garden",
      "Mountain View",
      "Additional highland stops",
    ],
    accommodation: ["Day tour — no overnight stay"],
    inclusions: [
      "Private air-conditioned van",
      "Driver / coordinator",
      "Parking & fuel",
    ],
    inclusionsNote: "Best for guests who want more highland photo stops.",
    exclusions: ["Meals", "Entrance fees", "Personal expenses"],
    exclusionsNote: "Wear comfortable shoes for garden and viewpoint walks.",
    ratesPerPax: [2620, 2140, 1790, 1770, 1580, 1460, 1310, 1340, 1280],
  }),
  withMeta({
    id: "bohol",
    title: "Bohol Countryside",
    minPax: 2,
    maxPax: 10,
    slotsAvailable: 10,
    days: 2,
    nights: 1,
    destinations: [
      "Chocolate Hills",
      "Tarsier Sanctuary",
      "Loboc River / floating lunch area",
      "Baclayon Church",
    ],
    accommodation: [
      "Standard twin/double room (1 night)",
      "Hotel subject to availability",
    ],
    inclusions: [
      "Private air-conditioned van",
      "Driver / coordinator",
      "Parking & fuel",
    ],
    inclusionsNote: "Ferry tickets can be arranged as an add-on.",
    exclusions: [
      "Meals",
      "Entrance fees",
      "Ferry tickets",
      "Personal expenses",
    ],
    exclusionsNote: "Loboc lunch is optional unless bundled separately.",
    ratesPerPax: [4720, 3960, 3570, 3440, 3270, 3200, 3070, 2980, 2900],
  }),
  withMeta({
    id: "cebu-safari",
    title: "Cebu Safari Tour",
    minPax: 2,
    maxPax: 10,
    slotsAvailable: 10,
    days: 1,
    nights: 0,
    destinations: ["Cebu Safari and Adventure Park"],
    accommodation: ["Day tour — no overnight stay"],
    inclusions: [
      "Private air-conditioned van",
      "Driver / coordinator",
      "Parking & fuel",
    ],
    inclusionsNote: "Park tickets are usually purchased separately.",
    exclusions: ["Park entrance tickets", "Meals", "Personal expenses"],
    exclusionsNote: "Arrive early — park queues can be long on weekends.",
    ratesPerPax: [3190, 2640, 2290, 2190, 2050, 2020, 1930, 1860, 1790],
  }),
];

export function normalizePackage(pkg: TourPackage): TourPackage {
  return {
    ...pkg,
    slotsAvailable: pkg.slotsAvailable ?? 10,
    days: pkg.days ?? 1,
    nights: pkg.nights ?? 0,
    accommodation: pkg.accommodation ?? [],
  };
}

export function pricePerPax(tour: TourPackage, guests: number): number {
  const clamped = Math.min(tour.maxPax, Math.max(tour.minPax, guests));
  const idx = clamped - tour.minPax;
  if (idx >= 0 && idx < tour.ratesPerPax.length) {
    return tour.ratesPerPax[idx];
  }
  return tour.ratesPerPax[tour.ratesPerPax.length - 1] ?? tour.ratesPerPax[0] ?? 0;
}

export function totalPrice(tour: TourPackage, guests: number): number {
  return pricePerPax(tour, guests) * guests;
}

export function formatPhp(amount: number): string {
  return `₱${amount.toLocaleString("en-PH")}`;
}

export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export function linesToList(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function listToLines(items: string[]): string {
  return items.join("\n");
}

export function ensureRatesLength(
  rates: number[],
  minPax: number,
  maxPax: number,
): number[] {
  const count = Math.max(1, maxPax - minPax + 1);
  const next = rates.slice(0, count);
  const fill = next[next.length - 1] ?? 0;
  while (next.length < count) next.push(fill);
  return next;
}
