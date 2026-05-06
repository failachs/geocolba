// ─── Categorías de marcadores ───────────────────────────────────────────────
export type MarkerCategory =
  | 'votante'
  | 'lider'
  | 'voluntario'
  | 'punto_votacion'
  | 'casa_visitada'
  | 'pendiente';

// ─── Estado de contacto ──────────────────────────────────────────────────────
export type ContactStatus =
  | 'confirmado'
  | 'contactado'
  | 'pendiente'
  | 'rechaza'
  | 'sin_validar'
  | 'sin_respuesta';

// ─── Tipo de mapa base ───────────────────────────────────────────────────────
export type MapType = 'roadmap' | 'satellite' | 'hybrid' | 'terrain';

// ─── Punto georreferenciado ──────────────────────────────────────────────────
export interface ElectoralPoint {
  id: string;
  nombre: string;
  cedula?: string;
  celular?: string;
  email?: string;
  categoria: MarkerCategory;
  lat: number;
  lng: number;
  direccion: string;
  barrio: string;
  municipio: string;
  departamento: string;
  estadoContacto: ContactStatus;
  puestoVotacion?: string;
  liderAsignado?: string;
  requiereTransporte?: boolean;
  notas?: string;
  creadoEn?: string;
  ultimoContacto?: string;
}

// ─── Estilos visuales por categoría ─────────────────────────────────────────
export interface MarkerStyle {
  color: string;       // hex del pin
  label: string;       // texto corto dentro del marcador
  bgColor: string;     // fondo del badge
  textColor: string;   // texto del badge
}

// ─── Estado de Street View ───────────────────────────────────────────────────
export interface StreetViewState {
  active: boolean;
  available: boolean | null;  // null = sin verificar
  loading: boolean;
  point?: ElectoralPoint;
  position?: google.maps.LatLng;
}

// ─── Filtros del mapa ────────────────────────────────────────────────────────
export interface MapFilters {
  categoria: MarkerCategory | 'todos';
  municipio: string;
  estadoContacto: ContactStatus | 'todos';
  lider: string;
  requiereTransporte: boolean | null;
}

// ─── Puesto de votación ──────────────────────────────────────────────────────
export interface VotingStation {
  id: string;
  nombre: string;
  lat: number;
  lng: number;
  mesas: number;
  municipio: string;
  departamento: string;
}

// ─── Estado global del mapa ──────────────────────────────────────────────────
export interface MapState {
  mapType: MapType;
  zoom: number;
  center: google.maps.LatLngLiteral;
  selectedPoint: ElectoralPoint | null;
  streetView: StreetViewState;
  filters: MapFilters;
  isLoaded: boolean;
  loadError: string | null;
  clusteringEnabled: boolean;
  showVotingStations: boolean;
}
