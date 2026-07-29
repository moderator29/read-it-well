"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import "leaflet/dist/leaflet.css";

export type CityPin = {
  city: string;
  lat: number;
  lng: number;
  /** Formatted lowest nightly price, e.g. "₦25,000". */
  price: string;
  count: number;
};

/**
 * The live map. Real tiles, real pan and zoom, price pins per covered city;
 * tapping a pin runs that city's search. Tiles follow the active theme: dark
 * cartography at night, paper in daylight. Leaflet loads lazily on the client
 * so the map costs nothing until this view is opened.
 */
export function RealMap({ pins, active }: { pins: CityPin[]; active?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    let map: import("leaflet").Map | undefined;
    let disposed = false;

    void (async () => {
      const L = (await import("leaflet")).default;
      if (disposed || !ref.current) return;

      map = L.map(ref.current, { scrollWheelZoom: true });
      const dark = document.documentElement.dataset.theme !== "light";
      L.tileLayer(
        dark
          ? "https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          : "https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        {
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        },
      ).addTo(map);

      map.fitBounds(
        L.latLngBounds(pins.map((p) => [p.lat, p.lng] as [number, number])),
        { padding: [56, 56] },
      );

      for (const p of pins) {
        const icon = L.divIcon({
          className: "nf-map-anchor",
          iconSize: [0, 0],
          html: `<span class="nf-map-pin${p.city === active ? " nf-map-pin--active" : ""}">${p.price}<i>${p.city}</i></span>`,
        });
        L.marker([p.lat, p.lng], { icon, title: `${p.city}: ${p.count} places` })
          .addTo(map)
          .on("click", () => router.push(`/search?q=${encodeURIComponent(p.city)}`));
      }
    })();

    return () => {
      disposed = true;
      map?.remove();
    };
  }, [pins, active, router]);

  return (
    <div
      ref={ref}
      role="application"
      aria-label="Map of covered cities"
      className="h-[420px] w-full sm:h-[560px]"
    />
  );
}
