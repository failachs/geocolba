// app/mapa/page.tsx
// ─── Ruta: /mapa ──────────────────────────────────────────────────────────────
// Esta es la página del Mapa Electoral dentro del App Router de Next.js.
// El componente ElectoralMapGoogle usa Google Maps JS API real.

import type { Metadata } from 'next';
import ElectoralMapGoogle from '@/components/electoral-map/ElectoralMapGoogle';

export const metadata: Metadata = {
  title: 'Mapa Electoral — Campaña 360 GeoCOLBA',
  description: 'Mapa interactivo georreferenciado para gestión electoral con Google Maps, Street View y marcadores por categoría.',
};

// Esta página no tiene padding ni layout de contenido — ocupa toda la pantalla
export default function MapaPage() {
  return <ElectoralMapGoogle />;
}
