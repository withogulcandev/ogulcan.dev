import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import type * as LeafletNS from 'leaflet';

export type Pin = {
  type: 'eat' | 'stay' | 'work';
  label: string;
  coord: [number, number]; // [lat, lng]
};

type Props = {
  pins: Pin[];
  height?: number;
};

const TYPE_COLOR: Record<Pin['type'], string> = {
  eat: '#C68B3E',
  stay: '#96455B',
  work: '#1F3D6B',
};

export default function Triangle({ pins, height = 320 }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<LeafletNS.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || leafletRef.current) return;
    let cancelled = false;

    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !mapRef.current) return;

      const map = L.map(mapRef.current, {
        dragging: false,
        touchZoom: false,
        doubleClickZoom: false,
        scrollWheelZoom: false,
        boxZoom: false,
        keyboard: false,
        zoomControl: false,
        attributionControl: true,
      });
      leafletRef.current = map;

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OSM &copy; CARTO',
        maxZoom: 19,
      }).addTo(map);

      const latlngs = pins.map((p) => L.latLng(p.coord[0], p.coord[1]));
      map.fitBounds(L.latLngBounds(latlngs), { padding: [40, 40], maxZoom: 16 });

      if (pins.length >= 3) {
        L.polygon(latlngs, {
          color: '#1F3D6B',
          weight: 1,
          opacity: 0.5,
          fillOpacity: 0.04,
          dashArray: '3 4',
        }).addTo(map);
      }

      pins.forEach((pin) => {
        const icon = L.divIcon({
          className: 'tri-pin',
          html: `<span style="background:${TYPE_COLOR[pin.type]}"></span>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });
        L.marker(pin.coord, { icon, alt: `${pin.type}: ${pin.label}` })
          .addTo(map)
          .bindTooltip(`<strong>${pin.type.toUpperCase()}</strong> — ${pin.label}`, {
            direction: 'top',
            offset: [0, -8],
            className: 'tri-tooltip',
          });
      });
    })();

    return () => {
      cancelled = true;
      if (leafletRef.current) {
        leafletRef.current.remove();
        leafletRef.current = null;
      }
    };
  }, [pins]);

  return (
    <div style={{ margin: '2rem 0' }}>
      <div
        ref={mapRef}
        style={{
          height: `${height}px`,
          border: '1px solid var(--rule)',
          background: 'var(--paper)',
        }}
        aria-hidden="true"
      />
      <ol
        style={{
          display: 'flex',
          gap: '1.75rem',
          margin: '0.9rem 0 0',
          padding: 0,
          listStyle: 'none',
          justifyContent: 'center',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.72rem',
          letterSpacing: '0.2em',
          color: 'var(--muted)',
        }}
      >
        {pins.map((p) => (
          <li key={`${p.type}-${p.label}`}>
            <span
              aria-hidden="true"
              style={{
                display: 'inline-block',
                width: 9,
                height: 9,
                background: TYPE_COLOR[p.type],
                borderRadius: '50%',
                marginRight: 8,
                verticalAlign: 'middle',
              }}
            />
            <span>{p.type.toUpperCase()}</span> · <span style={{ letterSpacing: '0.02em', textTransform: 'none' }}>{p.label}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
