export type EntryType = 'note' | 'stay' | 'eat' | 'work';

export interface AtlasEntry {
  slug: string;
  title: string;
  date: string; // ISO date
  country: string;
  city: string | null;
  type: EntryType;
  coord: [number, number] | null;
  summary: string | null;
}

export interface TimelineCity {
  city: string | null;
  entries: AtlasEntry[];
}

export interface TimelineCountry {
  country: string;
  cities: TimelineCity[];
}

export const TYPE_GLYPH: Record<EntryType, string> = {
  note: '◦',
  stay: '■',
  eat: '▲',
  work: '◆',
};

export const TYPE_COLOR: Record<EntryType, string> = {
  note: '#6A6862',
  stay: '#1F3D6B',
  eat: '#A34A28',
  work: '#3A6B1F',
};

function mean(coords: [number, number][]): [number, number] | null {
  if (!coords.length) return null;
  let lat = 0;
  let lng = 0;
  for (const [a, b] of coords) {
    lat += a;
    lng += b;
  }
  return [lat / coords.length, lng / coords.length];
}

export function deriveCityCoords(
  entries: AtlasEntry[],
): Record<string, [number, number]> {
  const acc: Record<string, [number, number][]> = {};
  for (const e of entries) {
    if (!e.coord || !e.city) continue;
    const key = `${e.country}/${e.city}`;
    (acc[key] ??= []).push(e.coord);
  }
  const out: Record<string, [number, number]> = {};
  for (const [k, v] of Object.entries(acc)) {
    const m = mean(v);
    if (m) out[k] = m;
  }
  return out;
}

export function deriveCountryCoords(
  entries: AtlasEntry[],
): Record<string, [number, number]> {
  const acc: Record<string, [number, number][]> = {};
  for (const e of entries) {
    if (!e.coord) continue;
    (acc[e.country] ??= []).push(e.coord);
  }
  const out: Record<string, [number, number]> = {};
  for (const [k, v] of Object.entries(acc)) {
    const m = mean(v);
    if (m) out[k] = m;
  }
  return out;
}

// Preserves chronological order — a new group starts when country/city changes,
// which naturally handles country revisits.
export function groupChronologically(
  entries: AtlasEntry[],
): TimelineCountry[] {
  const groups: TimelineCountry[] = [];
  let currentCountry: string | null = null;
  let currentCity: string | null | undefined = undefined;

  for (const e of entries) {
    if (e.country !== currentCountry) {
      groups.push({ country: e.country, cities: [] });
      currentCountry = e.country;
      currentCity = undefined;
    }
    const g = groups[groups.length - 1];
    const eCity = e.city ?? null;
    if (eCity !== currentCity) {
      g.cities.push({ city: eCity, entries: [] });
      currentCity = eCity;
    }
    g.cities[g.cities.length - 1].entries.push(e);
  }
  return groups;
}
