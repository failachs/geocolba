'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './base-datos.module.css';

type VoluntarioApi = {
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

type ApiStats = {
  total?: number;
  lideres?: number;
  voluntarios?: number;
  votaron?: number;
  no_votaron?: number;
  municipios?: number;
};

type ApiFiltroMunicipio = {
  municipio: string;
  cantidad: number;
};

type ApiResponse = {
  ok: boolean;
  data: VoluntarioApi[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats?: ApiStats;
  filtros?: {
    municipios?: ApiFiltroMunicipio[];
    departamentos?: { departamento: string; cantidad: number }[];
  };
  error?: string;
};

const CAT_COLORS: Record<string, string> = {
  lider: '#f59e0b',
  voluntario: '#22c55e',
  votante: '#3b82f6',
};

const CAT_LABELS: Record<string, string> = {
  lider: 'Líder',
  voluntario: 'Voluntario',
  votante: 'Votante',
};

const PER_PAGE = 15;

function normalizarTexto(value?: string | number | null) {
  return String(value ?? '').trim();
}

function normalizarLower(value?: string | number | null) {
  return normalizarTexto(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function getCategoria(asignado?: string | null) {
  const value = normalizarLower(asignado);

  if (value.includes('lider') || value.includes('líder')) {
    return 'lider';
  }

  return 'voluntario';
}

function getVoto(estado?: string | null) {
  const value = normalizarLower(estado);

  if (!value) return 'NO VOTÓ';

  if (
    value.includes('no voto') ||
    value.includes('no voto') ||
    value.includes('no votó') ||
    value.includes('no')
  ) {
    return 'NO VOTÓ';
  }

  if (
    value.includes('voto') ||
    value.includes('votó') ||
    value.includes('confirmado') ||
    value.includes('si') ||
    value.includes('sí')
  ) {
    return 'VOTÓ';
  }

  return 'NO VOTÓ';
}

function construirQuery(params: {
  page: number;
  limit: number;
  search: string;
  filterCat: string;
  filterMun: string;
  filterVoto: string;
}) {
  const query = new URLSearchParams();

  query.set('page', String(params.page));
  query.set('limit', String(params.limit));

  if (params.search.trim()) {
    query.set('search', params.search.trim());
  }

  if (params.filterMun !== 'todos') {
    query.set('municipio', params.filterMun);
  }

  if (params.filterCat !== 'todos') {
    query.set('asignado', params.filterCat === 'lider' ? 'lider' : 'voluntario');
  }

  if (params.filterVoto !== 'todos') {
    query.set('voto', params.filterVoto);
  }

  return query.toString();
}

export default function BaseDatosPage() {
  const [registros, setRegistros] = useState<VoluntarioApi[]>([]);
  const [stats, setStats] = useState<ApiStats>({
    total: 0,
    lideres: 0,
    voluntarios: 0,
    votaron: 0,
    no_votaron: 0,
    municipios: 0,
  });

  const [municipiosApi, setMunicipiosApi] = useState<ApiFiltroMunicipio[]>([]);

  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [filterCat, setFilterCat] = useState('todos');
  const [filterMun, setFilterMun] = useState('todos');
  const [filterVoto, setFilterVoto] = useState('todos');

  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [totalResultados, setTotalResultados] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchDebounced(search);
      setPage(1);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();

    async function cargarVoluntarios() {
      try {
        setLoading(true);
        setError('');

        const query = construirQuery({
          page,
          limit: PER_PAGE,
          search: searchDebounced,
          filterCat,
          filterMun,
          filterVoto,
        });

        const response = await fetch(`/api/voluntarios/listar?${query}`, {
          method: 'GET',
          signal: controller.signal,
          cache: 'no-store',
        });

        const json: ApiResponse = await response.json();

        if (!response.ok || !json.ok) {
          throw new Error(json.error || 'No fue posible cargar la base de voluntarios.');
        }

        setRegistros(Array.isArray(json.data) ? json.data : []);
        setStats(json.stats || {});
        setMunicipiosApi(json.filtros?.municipios || []);
        setTotalResultados(json.pagination?.total || 0);
        setPages(json.pagination?.totalPages || 1);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;

        const message =
          err instanceof Error ? err.message : 'Error cargando la base de voluntarios.';

        setError(message);
        setRegistros([]);
        setTotalResultados(0);
        setPages(1);
      } finally {
        setLoading(false);
      }
    }

    cargarVoluntarios();

    return () => controller.abort();
  }, [page, searchDebounced, filterCat, filterMun, filterVoto]);

  const municipios = useMemo(() => {
    const lista = municipiosApi
      .map((m) => normalizarTexto(m.municipio))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'es'));

    return ['todos', ...lista];
  }, [municipiosApi]);

  const registrosNormalizados = useMemo(() => {
    return registros.map((r) => {
      const categoria = getCategoria(r.asignado);
      const voto = getVoto(r.estado);

      return {
        ...r,
        categoria,
        voto,
        idVista: r.id || r.uid || '—',
        nombre: normalizarTexto(r.nombre_completo) || [
          normalizarTexto(r.nombres_completos),
          normalizarTexto(r.apellidos_completos),
        ].filter(Boolean).join(' ') || 'Sin nombre',
        celular: normalizarTexto(r.telefono_1) || normalizarTexto(r.telefono_2),
        correo: normalizarTexto(r.correo),
        barrio: normalizarTexto(r.barrio),
        municipio: normalizarTexto(r.municipio),
        cedula: normalizarTexto(r.cedula),
      };
    });
  }, [registros]);

  const totalLideres = Number(stats.lideres || 0);
  const totalVoluntarios = Number(stats.voluntarios || 0);
  const totalVotaron = Number(stats.votaron || 0);
  const totalNoVotaron = Number(stats.no_votaron || 0);
  const totalMunicipios = Number(stats.municipios || municipios.length - 1 || 0);
  const totalGeneral = Number(stats.total || totalResultados || 0);

  const hayFiltros =
    search ||
    filterCat !== 'todos' ||
    filterMun !== 'todos' ||
    filterVoto !== 'todos';

  const limpiarFiltros = () => {
    setSearch('');
    setSearchDebounced('');
    setFilterCat('todos');
    setFilterMun('todos');
    setFilterVoto('todos');
    setPage(1);
  };

  const exportarCSV = async () => {
    try {
      const query = construirQuery({
        page: 1,
        limit: 5000,
        search: searchDebounced,
        filterCat,
        filterMun,
        filterVoto,
      });

      const response = await fetch(`/api/voluntarios/listar?${query}`, {
        method: 'GET',
        cache: 'no-store',
      });

      const json: ApiResponse = await response.json();

      if (!response.ok || !json.ok) {
        throw new Error(json.error || 'No fue posible exportar la información.');
      }

      const data = Array.isArray(json.data) ? json.data : [];

      const headers = [
        'ID',
        'Cédula',
        'Nombre',
        'Celular 1',
        'Celular 2',
        'Correo',
        'Dirección',
        'Barrio',
        'Municipio',
        'Departamento',
        'Rol',
        'Estado',
        'Votó',
      ];

      const rows = data.map((r) => {
        const categoria = getCategoria(r.asignado);
        const voto = getVoto(r.estado);

        return [
          r.id || r.uid || '',
          normalizarTexto(r.cedula),
          normalizarTexto(r.nombre_completo),
          normalizarTexto(r.telefono_1),
          normalizarTexto(r.telefono_2),
          normalizarTexto(r.correo),
          normalizarTexto(r.direccion),
          normalizarTexto(r.barrio),
          normalizarTexto(r.municipio),
          normalizarTexto(r.departamento),
          CAT_LABELS[categoria] || categoria,
          normalizarTexto(r.estado),
          voto,
        ];
      });

      const csv = [headers, ...rows]
        .map((row) =>
          row
            .map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`)
            .join(',')
        )
        .join('\n');

      const blob = new Blob(['\uFEFF' + csv], {
        type: 'text/csv;charset=utf-8;',
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');

      a.href = url;
      a.download = 'voluntarios_geocolba.csv';
      a.click();

      URL.revokeObjectURL(url);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error exportando el CSV.';

      alert(message);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Base de datos</h1>
          <p className={styles.subtitle}>
            {totalResultados.toLocaleString('es-CO')} registros encontrados ·{' '}
            {totalGeneral.toLocaleString('es-CO')} total campaña · Atlántico 2026
          </p>
        </div>

        <button className={styles.btnSecondary} onClick={exportarCSV}>
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Exportar CSV
        </button>
      </div>

      <div className={styles.statsRow}>
        {[
          { label: 'Total', value: totalGeneral, color: '#0ea5e9' },
          { label: 'Líderes', value: totalLideres, color: '#f59e0b' },
          { label: 'Voluntarios', value: totalVoluntarios, color: '#22c55e' },
          { label: 'Votaron', value: totalVotaron, color: '#22c55e' },
          { label: 'No votaron', value: totalNoVotaron, color: '#ef4444' },
          { label: 'Municipios', value: totalMunicipios, color: '#8b5cf6' },
        ].map((s) => (
          <div key={s.label} className={styles.statCard}>
            <div className={styles.statNum} style={{ color: s.color }}>
              {Number(s.value || 0).toLocaleString('es-CO')}
            </div>
            <div className={styles.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className={styles.filters}>
        <div className={styles.searchWrap}>
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>

          <input
            className={styles.searchInput}
            placeholder="Buscar nombre, cédula, barrio, celular…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className={styles.filterSelect}
          value={filterCat}
          onChange={(e) => {
            setFilterCat(e.target.value);
            setPage(1);
          }}
        >
          <option value="todos">Todos los roles</option>
          <option value="lider">Líder</option>
          <option value="voluntario">Voluntario</option>
        </select>

        <select
          className={styles.filterSelect}
          value={filterMun}
          onChange={(e) => {
            setFilterMun(e.target.value);
            setPage(1);
          }}
        >
          {municipios.map((m) => (
            <option key={m} value={m}>
              {m === 'todos' ? 'Todos los municipios' : m}
            </option>
          ))}
        </select>

        <select
          className={styles.filterSelect}
          value={filterVoto}
          onChange={(e) => {
            setFilterVoto(e.target.value);
            setPage(1);
          }}
        >
          <option value="todos">Votó y no votó</option>
          <option value="VOTÓ">Solo votaron</option>
          <option value="NO VOTÓ">No votaron</option>
        </select>

        {hayFiltros && (
          <button className={styles.btnClear} onClick={limpiarFiltros}>
            Limpiar
          </button>
        )}

        <span className={styles.resultCount}>
          {loading
            ? 'Cargando...'
            : `${totalResultados.toLocaleString('es-CO')} resultados`}
        </span>
      </div>

      {error && (
        <div className={styles.empty}>
          {error}
        </div>
      )}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>Nombre</th>
              <th>Cédula</th>
              <th>Celular</th>
              <th>Barrio · Municipio</th>
              <th>Rol</th>
              <th>Voto</th>
            </tr>
          </thead>

          <tbody>
            {registrosNormalizados.map((r) => (
              <tr key={String(r.uid || r.id || r.cedula)}>
                <td className={styles.mono}>{r.idVista}</td>

                <td>
                  <div className={styles.nameMain}>{r.nombre}</div>
                  {r.correo && <div className={styles.nameSub}>{r.correo}</div>}
                </td>

                <td className={styles.mono}>{r.cedula || '—'}</td>
                <td className={styles.mono}>{r.celular || '—'}</td>

                <td>
                  <div className={styles.nameMain}>{r.barrio || '—'}</div>
                  <div className={styles.nameSub}>{r.municipio || '—'}</div>
                </td>

                <td>
                  <span
                    className={styles.catBadge}
                    style={{
                      background: `${CAT_COLORS[r.categoria]}20`,
                      color: CAT_COLORS[r.categoria],
                    }}
                  >
                    {CAT_LABELS[r.categoria] || r.categoria}
                  </span>
                </td>

                <td>
                  <span
                    className={styles.votoBadge}
                    style={{
                      background: r.voto === 'VOTÓ' ? '#f0fdf4' : '#fff5f5',
                      color: r.voto === 'VOTÓ' ? '#15803d' : '#dc2626',
                    }}
                  >
                    {r.voto}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!loading && registrosNormalizados.length === 0 && !error && (
          <div className={styles.empty}>No hay registros con ese filtro</div>
        )}

        {loading && (
          <div className={styles.empty}>Cargando registros desde Railway...</div>
        )}
      </div>

      {pages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.pageBtn}
            disabled={page === 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ← Anterior
          </button>

          <div className={styles.pageNums}>
            {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
              const n = page <= 4 ? i + 1 : page + i - 3;

              if (n < 1 || n > pages) return null;

              return (
                <button
                  key={n}
                  className={`${styles.pageNum} ${
                    page === n ? styles.pageNumActive : ''
                  }`}
                  disabled={loading}
                  onClick={() => setPage(n)}
                >
                  {n}
                </button>
              );
            })}
          </div>

          <button
            className={styles.pageBtn}
            disabled={page === pages || loading}
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
          >
            Siguiente →
          </button>

          <span className={styles.pageInfo}>
            Página {page} de {pages}
          </span>
        </div>
      )}
    </div>
  );
}