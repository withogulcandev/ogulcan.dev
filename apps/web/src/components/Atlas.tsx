import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { AtlasEntry } from '../lib/atlas';
import { TYPE_COLOR, TYPE_GLYPH } from '../lib/atlas';

interface Props {
  entries: AtlasEntry[];
  cityCoords: Record<string, [number, number]>;
  countryCoords: Record<string, [number, number]>;
}

function makeIcon(type: AtlasEntry['type'], active: boolean) {
  const color = TYPE_COLOR[type];
  const glyph = TYPE_GLYPH[type];
  const size = active ? 34 : 20;
  return L.divIcon({
    className: `atlas-marker${active ? ' active' : ''}`,
    html: `<span style="color:${color};font-size:${size}px;line-height:1;font-family:'JetBrains Mono',ui-monospace,monospace;text-shadow:0 0 4px rgba(251,250,247,0.95),0 0 12px rgba(251,250,247,0.6);">${glyph}</span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function resolveCoord(
  entry: AtlasEntry,
  cityCoords: Record<string, [number, number]>,
  countryCoords: Record<string, [number, number]>,
): { coord: [number, number]; zoom: number } | null {
  if (entry.coord) return { coord: entry.coord, zoom: 15 };
  if (entry.city) {
    const key = `${entry.country}/${entry.city}`;
    if (cityCoords[key]) return { coord: cityCoords[key], zoom: 12 };
  }
  if (countryCoords[entry.country]) {
    return { coord: countryCoords[entry.country], zoom: 5 };
  }
  return null;
}

export default function Atlas({ entries, cityCoords, countryCoords }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const [activeSlug, setActiveSlug] = useState<string | null>(
    entries[0]?.slug ?? null,
  );
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    if (!mapRef.current || mapInstance.current) return;

    const initial = entries[0]
      ? resolveCoord(entries[0], cityCoords, countryCoords)
      : null;

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      keyboard: false,
      boxZoom: false,
      zoomAnimation: true,
      fadeAnimation: true,
    });

    map.setView(initial?.coord ?? [30, 0], initial?.zoom ?? 2);

    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      {
        subdomains: 'abcd',
        maxZoom: 19,
      },
    ).addTo(map);

    for (const entry of entries) {
      if (!entry.coord) continue;
      const marker = L.marker(entry.coord, {
        icon: makeIcon(entry.type, entry.slug === entries[0]?.slug),
        keyboard: false,
        interactive: false,
      }).addTo(map);
      markersRef.current[entry.slug] = marker;
    }

    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
      markersRef.current = {};
    };
  }, [entries, cityCoords, countryCoords, reducedMotion]);

  useEffect(() => {
    const sections = document.querySelectorAll<HTMLElement>(
      'article[data-slug]',
    );
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (obs) => {
        const visible = obs.filter((o) => o.isIntersecting);
        if (!visible.length) return;
        visible.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const slug = visible[0].target.getAttribute('data-slug');
        if (slug) setActiveSlug(slug);
      },
      {
        rootMargin: '-40% 0px -40% 0px',
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    );

    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const anchors = document.querySelectorAll<HTMLElement>(
      'a.wikilink[data-entry]',
    );
    if (!anchors.length) return;

    const known = new Set(entries.map((e) => e.slug));

    const observer = new IntersectionObserver(
      (obs) => {
        const visible = obs.filter((o) => o.isIntersecting);
        if (!visible.length) return;
        const slug = (visible[0].target as HTMLElement).dataset.entry;
        if (slug && known.has(slug)) setActiveSlug(slug);
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0.5 },
    );

    anchors.forEach((a) => observer.observe(a));
    return () => observer.disconnect();
  }, [entries]);

  useEffect(() => {
    if (!activeSlug) return;
    const entry = entries.find((e) => e.slug === activeSlug);
    if (!entry) return;

    document
      .querySelectorAll('.timeline [data-active]')
      .forEach((el) => el.removeAttribute('data-active'));

    const entryEl = document.querySelector(
      `.timeline-entry[data-slug="${CSS.escape(activeSlug)}"]`,
    );
    if (entryEl) {
      entryEl.setAttribute('data-active', '');
      entryEl.closest('.timeline-city')?.setAttribute('data-active', '');
      entryEl.closest('.timeline-country')?.setAttribute('data-active', '');
    }

    if (!mapInstance.current) return;

    const resolved = resolveCoord(entry, cityCoords, countryCoords);
    if (resolved) {
      mapInstance.current.flyTo(resolved.coord, resolved.zoom, {
        duration: 1.6,
        easeLinearity: 0.25,
      });
    }

    for (const [slug, marker] of Object.entries(markersRef.current)) {
      const en = entries.find((e) => e.slug === slug);
      if (!en) continue;
      marker.setIcon(makeIcon(en.type, slug === activeSlug));
    }
  }, [activeSlug, entries, cityCoords, countryCoords]);

  if (reducedMotion) return null;

  return (
    <>
      <div
        ref={mapRef}
        className="atlas-map"
        aria-hidden="true"
        role="presentation"
      />
      <div className="atlas-spotlight" aria-hidden="true" />
    </>
  );
}
