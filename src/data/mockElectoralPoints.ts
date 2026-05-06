import {
  ElectoralPoint,
  MarkerCategory,
  MarkerStyle,
  VotingStation,
} from '@/types/electoralMap';

// ─── Estilos visuales por categoría ─────────────────────────────────────────
export const MARKER_STYLES: Record<MarkerCategory, MarkerStyle> = {
  votante: {
    color: '#3b82f6',
    label: 'V',
    bgColor: '#eff6ff',
    textColor: '#1d4ed8',
  },
  lider: {
    color: '#f59e0b',
    label: 'L',
    bgColor: '#fffbeb',
    textColor: '#b45309',
  },
  voluntario: {
    color: '#22c55e',
    label: 'VL',
    bgColor: '#f0fdf4',
    textColor: '#15803d',
  },
  punto_votacion: {
    color: '#ef4444',
    label: 'PV',
    bgColor: '#fef2f2',
    textColor: '#b91c1c',
  },
  casa_visitada: {
    color: '#8b5cf6',
    label: 'CV',
    bgColor: '#f5f3ff',
    textColor: '#7c3aed',
  },
  pendiente: {
    color: '#6b7280',
    label: 'P',
    bgColor: '#f9fafb',
    textColor: '#374151',
  },
};

export const CATEGORY_LABELS: Record<MarkerCategory | 'todos', string> = {
  todos: 'Todos',
  votante: 'Votantes',
  lider: 'Líderes',
  voluntario: 'Voluntarios',
  punto_votacion: 'Puntos de Votación',
  casa_visitada: 'Casas Visitadas',
  pendiente: 'Pendientes',
};

export const STATUS_LABELS: Record<string, string> = {
  todos: 'Todos',
  confirmado: 'Confirmado',
  contactado: 'Contactado',
  pendiente: 'Pendiente',
  rechaza: 'Rechaza',
  sin_validar: 'Sin validar',
  sin_respuesta: 'Sin respuesta',
};

export const STATUS_STYLES: Record<
  string,
  { bg: string; text: string; dot: string }
> = {
  confirmado: {
    bg: 'rgba(34,197,94,.1)',
    text: '#15803d',
    dot: '#22c55e',
  },
  contactado: {
    bg: 'rgba(59,130,246,.1)',
    text: '#1d4ed8',
    dot: '#3b82f6',
  },
  pendiente: {
    bg: 'rgba(245,158,11,.1)',
    text: '#b45309',
    dot: '#f59e0b',
  },
  rechaza: {
    bg: 'rgba(239,68,68,.1)',
    text: '#b91c1c',
    dot: '#ef4444',
  },
  sin_validar: {
    bg: 'rgba(139,92,246,.1)',
    text: '#7c3aed',
    dot: '#8b5cf6',
  },
  sin_respuesta: {
    bg: 'rgba(107,114,128,.1)',
    text: '#374151',
    dot: '#6b7280',
  },
};

// ─── Tipos internos desde API de voluntarios ────────────────────────────────
export type VoluntarioApi = {
  uid?: number;
  id?: string | number | null;
  cedula?: string | null;
  asignado?: string | null;
  nombres_completos?: string | null;
  apellidos_completos?: string | null;
  nombre_completo?: string | null;
  direccion?: string | null;
  barrio?: string | null;
  municipio?: string | null;
  departamento?: string | null;
  telefono_1?: string | null;
  telefono_2?: string | null;
  correo?: string | null;
  estado?: string | null;
  fecha_cargue?: string | null;
};

type VoluntariosListarResponse = {
  ok: boolean;
  data?: VoluntarioApi[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats?: {
    total?: number;
    lideres?: number;
    voluntarios?: number;
    votaron?: number;
    no_votaron?: number;
    municipios?: number;
  };
  filtros?: {
    municipios?: { municipio: string; cantidad: number }[];
    departamentos?: { departamento: string; cantidad: number }[];
  };
  error?: string;
};

// ─── Utilidades ──────────────────────────────────────────────────────────────
function texto(value?: string | number | null) {
  return String(value ?? '').trim();
}

function normalizar(value?: string | number | null) {
  return texto(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function limpiarCedula(value?: string | number | null) {
  return texto(value).replace(/\D/g, '');
}

function getNombreCompleto(v: VoluntarioApi) {
  return (
    texto(v.nombre_completo) ||
    [texto(v.nombres_completos), texto(v.apellidos_completos)]
      .filter(Boolean)
      .join(' ') ||
    'Sin nombre'
  );
}

function getCategoria(v: VoluntarioApi): MarkerCategory {
  const asignado = normalizar(v.asignado);
  const estado = normalizar(v.estado);

  if (asignado.includes('lider')) {
    return 'lider';
  }

  if (
    estado.includes('pendiente') ||
    estado.includes('no voto') ||
    estado.includes('no votó') ||
    estado === ''
  ) {
    return 'pendiente';
  }

  return 'voluntario';
}

function getEstadoContacto(v: VoluntarioApi) {
  const estado = normalizar(v.estado);

  if (!estado) return 'pendiente';

  if (
    estado.includes('no voto') ||
    estado.includes('no votó') ||
    estado.includes('pendiente')
  ) {
    return 'pendiente';
  }

  if (
    estado.includes('voto') ||
    estado.includes('votó') ||
    estado.includes('confirmado') ||
    estado.includes('si') ||
    estado.includes('sí')
  ) {
    return 'confirmado';
  }

  if (estado.includes('rechaza') || estado.includes('rechazo')) {
    return 'rechaza';
  }

  return 'sin_validar';
}

function getLiderAsignado(v: VoluntarioApi) {
  const asignado = texto(v.asignado);

  if (!asignado) return 'Sin asignar';

  return asignado;
}

// ─── Centro por defecto: Atlántico / Barranquilla ────────────────────────────
export const MAP_CENTER_DEFAULT = {
  lat: 10.96854,
  lng: -74.78132,
};

export const MAP_ZOOM_DEFAULT = 11;

// ─── Coordenadas aproximadas por municipio ──────────────────────────────────
// Nota: la tabla public.voluntarios no tiene lat/lng. Por eso se usa el centro
// aproximado del municipio y un desplazamiento pequeño determinístico por cédula.
// Cuando agregues lat/lng reales, reemplaza esta lógica por esos campos.
const MUNICIPIO_COORDS: Record<string, { lat: number; lng: number }> = {
  barranquilla: { lat: 10.96854, lng: -74.78132 },
  soledad: { lat: 10.91843, lng: -74.76459 },
  galapa: { lat: 10.89686, lng: -74.886 },
  malambo: { lat: 10.85953, lng: -74.77386 },
  'puerto colombia': { lat: 10.98778, lng: -74.95472 },
  sabanalarga: { lat: 10.63072, lng: -74.92214 },
  baranoa: { lat: 10.79408, lng: -74.9164 },
  tubara: { lat: 10.87562, lng: -74.97873 },
  tubará: { lat: 10.87562, lng: -74.97873 },
  'juan de acosta': { lat: 10.82905, lng: -75.03373 },
  polonuevo: { lat: 10.77774, lng: -74.85345 },
  'palmar de varela': { lat: 10.74055, lng: -74.75443 },
  'santo tomas': { lat: 10.75789, lng: -74.75451 },
  'santo tomás': { lat: 10.75789, lng: -74.75451 },
  ponedera: { lat: 10.64271, lng: -74.75327 },
  'campo de la cruz': { lat: 10.37814, lng: -74.88305 },
  candelaria: { lat: 10.45902, lng: -74.87992 },
  manati: { lat: 10.44544, lng: -74.95737 },
  manatí: { lat: 10.44544, lng: -74.95737 },
  repelon: { lat: 10.4937, lng: -75.12448 },
  repelón: { lat: 10.4937, lng: -75.12448 },
  luruaco: { lat: 10.61755, lng: -75.14506 },
  suan: { lat: 10.30298, lng: -74.91479 },
  usiacuri: { lat: 10.74306, lng: -74.97624 },
  usiacurí: { lat: 10.74306, lng: -74.97624 },

  cartagena: { lat: 10.39105, lng: -75.47943 },
  'santa marta': { lat: 11.24079, lng: -74.19904 },
  sincelejo: { lat: 9.30472, lng: -75.39778 },
};

function getMunicipioCenter(municipio?: string | null) {
  const key = normalizar(municipio);

  return MUNICIPIO_COORDS[key] || MAP_CENTER_DEFAULT;
}

function hashNumerico(value: string) {
  let hash = 0;

  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) % 100000;
  }

  return hash;
}

function getCoordenadasAproximadas(v: VoluntarioApi) {
  const base = getMunicipioCenter(v.municipio);
  const seed =
    limpiarCedula(v.cedula) ||
    texto(v.id) ||
    texto(v.uid) ||
    getNombreCompleto(v);

  const hash = hashNumerico(seed);

  // Desplazamiento pequeño para que no todos los puntos queden exactamente encima.
  const latOffset = ((hash % 200) - 100) / 100000;
  const lngOffset = ((Math.floor(hash / 200) % 200) - 100) / 100000;

  return {
    lat: base.lat + latOffset,
    lng: base.lng + lngOffset,
  };
}

// ─── Transformador BD → Punto electoral ─────────────────────────────────────
export function voluntarioToElectoralPoint(v: VoluntarioApi): ElectoralPoint {
  const coords = getCoordenadasAproximadas(v);
  const nombre = getNombreCompleto(v);
  const categoria = getCategoria(v);

  return {
    id: String(v.uid || v.id || limpiarCedula(v.cedula) || nombre),
    nombre,
    cedula: texto(v.cedula),
    celular: texto(v.telefono_1) || texto(v.telefono_2),
    categoria,
    lat: coords.lat,
    lng: coords.lng,
    direccion: texto(v.direccion),
    barrio: texto(v.barrio),
    municipio: texto(v.municipio),
    departamento: texto(v.departamento),
    estadoContacto: getEstadoContacto(v),
    puestoVotacion: 'No consultado',
    liderAsignado: getLiderAsignado(v),
    requiereTransporte: false,
    ultimoContacto: texto(v.fecha_cargue),
    notas: `Registro cargado desde public.voluntarios. Rol base: ${
      texto(v.asignado) || categoria
    }.`,
  };
}

// ─── Carga real desde API ───────────────────────────────────────────────────
export async function cargarElectoralPointsDesdeBD(options?: {
  limit?: number;
  search?: string;
  municipio?: string;
  categoria?: MarkerCategory | 'todos';
  voto?: 'VOTÓ' | 'NO VOTÓ' | 'todos';
}): Promise<ElectoralPoint[]> {
  const params = new URLSearchParams();

  params.set('page', '1');
  params.set('limit', String(options?.limit || 5000));

  if (options?.search) {
    params.set('search', options.search);
  }

  if (options?.municipio && options.municipio !== 'todos') {
    params.set('municipio', options.municipio);
  }

  if (options?.categoria && options.categoria !== 'todos') {
    if (options.categoria === 'lider') {
      params.set('asignado', 'lider');
    }

    if (options.categoria === 'voluntario') {
      params.set('asignado', 'voluntario');
    }

    if (options.categoria === 'pendiente') {
      params.set('voto', 'NO VOTÓ');
    }
  }

  if (options?.voto && options.voto !== 'todos') {
    params.set('voto', options.voto);
  }

  const res = await fetch(`/api/voluntarios/listar?${params.toString()}`, {
    method: 'GET',
    cache: 'no-store',
  });

  const json = (await res.json()) as VoluntariosListarResponse;

  if (!res.ok || !json.ok) {
    throw new Error(json.error || 'No fue posible cargar los puntos electorales.');
  }

  return (json.data || []).map(voluntarioToElectoralPoint);
}

export async function cargarMunicipiosDesdeBD(): Promise<string[]> {
  const res = await fetch('/api/voluntarios/listar?page=1&limit=1', {
    method: 'GET',
    cache: 'no-store',
  });

  const json = (await res.json()) as VoluntariosListarResponse;

  if (!res.ok || !json.ok) {
    throw new Error(json.error || 'No fue posible cargar municipios.');
  }

  const municipios = (json.filtros?.municipios || [])
    .map((m) => texto(m.municipio))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, 'es'));

  return ['todos', ...municipios];
}

export async function cargarLideresDesdeBD(): Promise<string[]> {
  const res = await fetch('/api/voluntarios/listar?page=1&limit=5000', {
    method: 'GET',
    cache: 'no-store',
  });

  const json = (await res.json()) as VoluntariosListarResponse;

  if (!res.ok || !json.ok) {
    throw new Error(json.error || 'No fue posible cargar líderes.');
  }

  const lideres = Array.from(
    new Set(
      (json.data || [])
        .filter((v) => getCategoria(v) === 'lider')
        .map((v) => getNombreCompleto(v))
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b, 'es'));

  return ['todos', ...lideres];
}

// ─── Puestos de votación ─────────────────────────────────────────────────────
// Ya no dejamos puestos falsos de Medellín.
// Cuando conectes la API de puesto de votación, aquí puedes transformar esos datos.
export const MOCK_VOTING_STATIONS: VotingStation[] = [];

// ─── Puntos electorales ──────────────────────────────────────────────────────
// Ya no dejamos personas falsas.
// El mapa debe cargar con cargarElectoralPointsDesdeBD().
export const MOCK_ELECTORAL_POINTS: ElectoralPoint[] = [];

// ─── Municipios y líderes por defecto ────────────────────────────────────────
// Se dejan solo como fallback inicial mientras carga la BD.
export const MUNICIPIOS = ['todos'];
export const LIDERES_LIST = ['todos'];