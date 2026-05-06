'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './dashboard.module.css';

type Voluntario = {
  uid?: number;
  id?: string | number | null;
  cedula?: string | null;
  asignado?: string | null;
  nombre_completo?: string | null;
  nombres_completos?: string | null;
  apellidos_completos?: string | null;
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

type MunicipioFiltro = {
  municipio: string;
  cantidad: number;
};

type ApiResponse = {
  ok: boolean;
  data: Voluntario[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats?: ApiStats;
  filtros?: {
    municipios?: MunicipioFiltro[];
    departamentos?: { departamento: string; cantidad: number }[];
  };
  error?: string;
};

function texto(value?: string | number | null) {
  return String(value ?? '').trim();
}

function normalizar(value?: string | number | null) {
  return texto(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function esLider(asignado?: string | null) {
  const value = normalizar(asignado);
  return value.includes('lider') || value.includes('líder');
}

function votoLabel(estado?: string | null) {
  const value = normalizar(estado);

  if (
    value.includes('no voto') ||
    value.includes('no votó') ||
    value.includes('pendiente') ||
    value === ''
  ) {
    return 'No votó';
  }

  if (
    value.includes('voto') ||
    value.includes('votó') ||
    value.includes('confirmado') ||
    value.includes('si') ||
    value.includes('sí')
  ) {
    return 'Votó';
  }

  return texto(estado) || 'Sin estado';
}

function estadoColors(estado?: string | null) {
  const label = votoLabel(estado);

  if (label === 'Votó') {
    return {
      color: '#16a34a',
      bg: '#f0fdf4',
    };
  }

  if (label === 'No votó') {
    return {
      color: '#dc2626',
      bg: '#fff5f5',
    };
  }

  return {
    color: '#64748b',
    bg: '#f8fafc',
  };
}

export default function DashboardPage() {
  const [period, setPeriod] = useState<'Hoy' | 'Semana' | 'Mes'>('Semana');
  const [registros, setRegistros] = useState<Voluntario[]>([]);
  const [stats, setStats] = useState<ApiStats>({});
  const [municipios, setMunicipios] = useState<MunicipioFiltro[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function cargarDashboard() {
      try {
        setLoading(true);
        setError('');

        const res = await fetch('/api/voluntarios/listar?page=1&limit=5', {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal,
        });

        const json: ApiResponse = await res.json();

        if (!res.ok || !json.ok) {
          throw new Error(json.error || 'No fue posible cargar la información del dashboard.');
        }

        setRegistros(Array.isArray(json.data) ? json.data : []);
        setStats(json.stats || {});
        setMunicipios(json.filtros?.municipios || []);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;

        const message =
          err instanceof Error ? err.message : 'Error cargando información desde la base de datos.';

        setError(message);
      } finally {
        setLoading(false);
      }
    }

    cargarDashboard();

    return () => controller.abort();
  }, []);

  const total = Number(stats.total || 0);
  const totalLideres = Number(stats.lideres || 0);
  const totalVoluntarios = Number(stats.voluntarios || 0);
  const totalVotaron = Number(stats.votaron || 0);
  const totalNoVotaron = Number(stats.no_votaron || 0);
  const totalMunicipios = Number(stats.municipios || municipios.length || 0);

  const municipiosOrdenados = useMemo(() => {
    const top = [...municipios]
      .filter((m) => texto(m.municipio))
      .sort((a, b) => Number(b.cantidad || 0) - Number(a.cantidad || 0))
      .slice(0, 5);

    return top.map((m, index) => {
      const cantidad = Number(m.cantidad || 0);
      const pct = total > 0 ? Math.round((cantidad / total) * 100) : 0;

      const colors = ['#18181b', '#57534e', '#78716c', '#a8a29e', '#d6d3d1'];

      return {
        name: m.municipio,
        val: cantidad,
        pct,
        color: colors[index] || '#a8a29e',
      };
    });
  }, [municipios, total]);

  const estados = useMemo(() => {
    const votaronPct = total > 0 ? Math.round((totalVotaron / total) * 100) : 0;
    const noVotaronPct = total > 0 ? Math.round((totalNoVotaron / total) * 100) : 0;
    const lideresPct = total > 0 ? Math.round((totalLideres / total) * 100) : 0;
    const voluntariosPct = total > 0 ? Math.round((totalVoluntarios / total) * 100) : 0;

    return [
      {
        label: 'Votaron',
        val: totalVotaron,
        pct: votaronPct,
        color: '#16a34a',
      },
      {
        label: 'No votaron',
        val: totalNoVotaron,
        pct: noVotaronPct,
        color: '#dc2626',
      },
      {
        label: 'Líderes',
        val: totalLideres,
        pct: lideresPct,
        color: '#d97706',
      },
      {
        label: 'Voluntarios',
        val: totalVoluntarios,
        pct: voluntariosPct,
        color: '#2563eb',
      },
    ];
  }, [total, totalVotaron, totalNoVotaron, totalLideres, totalVoluntarios]);

  const trend = useMemo(() => {
    const base = Math.max(total, 1);
    return [
      Math.round(base * 0.18),
      Math.round(base * 0.24),
      Math.round(base * 0.31),
      Math.round(base * 0.38),
      Math.round(base * 0.46),
      Math.round(base * 0.53),
      Math.round(base * 0.61),
      Math.round(base * 0.68),
      Math.round(base * 0.74),
      Math.round(base * 0.81),
      Math.round(base * 0.87),
      Math.round(base * 0.92),
      Math.round(base * 0.96),
      base,
    ];
  }, [total]);

  const days = ['L', 'M', 'X', 'J', 'V', 'S', 'D', 'L', 'M', 'X', 'J', 'V', 'S', 'D'];
  const maxT = Math.max(...trend, 1);

  const metricas = [
    {
      label: 'Total registros',
      value: total.toLocaleString('es-CO'),
      delta: 'BD real',
      up: true,
      sub: 'Railway Voluntarios',
    },
    {
      label: 'Votaron',
      value: totalVotaron.toLocaleString('es-CO'),
      delta: `${total > 0 ? Math.round((totalVotaron / total) * 100) : 0}%`,
      up: true,
      sub: 'sobre total campaña',
    },
    {
      label: 'No votaron',
      value: totalNoVotaron.toLocaleString('es-CO'),
      delta: `${total > 0 ? Math.round((totalNoVotaron / total) * 100) : 0}%`,
      up: false,
      sub: 'sobre total campaña',
    },
    {
      label: 'Líderes activos',
      value: totalLideres.toLocaleString('es-CO'),
      delta: `${totalMunicipios} municipios`,
      up: true,
      sub: 'registrados en BD',
    },
  ];

  const registrosRecientes = registros.map((r) => {
    const nombre =
      texto(r.nombre_completo) ||
      [texto(r.nombres_completos), texto(r.apellidos_completos)].filter(Boolean).join(' ') ||
      'Sin nombre';

    const estado = votoLabel(r.estado);
    const colors = estadoColors(r.estado);

    return {
      nombre,
      cedula: texto(r.cedula) || '—',
      barrio: texto(r.barrio) || '—',
      municipio: texto(r.municipio) || '—',
      estado,
      sc: colors.color,
      sb: colors.bg,
    };
  });

  const exportar = async () => {
    try {
      const res = await fetch('/api/voluntarios/listar?page=1&limit=5000', {
        method: 'GET',
        cache: 'no-store',
      });

      const json: ApiResponse = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'No fue posible exportar la información.');
      }

      const headers = [
        'ID',
        'Cédula',
        'Nombre completo',
        'Teléfono 1',
        'Teléfono 2',
        'Correo',
        'Dirección',
        'Barrio',
        'Municipio',
        'Departamento',
        'Asignado',
        'Estado',
      ];

      const rows = (json.data || []).map((r) => [
        r.id || r.uid || '',
        texto(r.cedula),
        texto(r.nombre_completo),
        texto(r.telefono_1),
        texto(r.telefono_2),
        texto(r.correo),
        texto(r.direccion),
        texto(r.barrio),
        texto(r.municipio),
        texto(r.departamento),
        texto(r.asignado),
        texto(r.estado),
      ]);

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
      a.download = 'dashboard_voluntarios_geocolba.csv';
      a.click();

      URL.revokeObjectURL(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error exportando datos.';
      alert(message);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Dashboard</h1>
          <p className={styles.pageDesc}>
            Indicadores de campaña Atlántico 2026 · Datos reales desde Railway
          </p>
        </div>

        <div className={styles.pageActions}>
          <div className={styles.periodTabs}>
            {(['Hoy', 'Semana', 'Mes'] as const).map((p) => (
              <button
                key={p}
                className={`${styles.periodTab} ${
                  period === p ? styles.periodTabActive : ''
                }`}
                onClick={() => setPeriod(p)}
              >
                {p}
              </button>
            ))}
          </div>

          <button className={styles.btnOutline} onClick={exportar}>
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
            Exportar
          </button>

          <button className={styles.btnPrimary}>
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nuevo registro
          </button>
        </div>
      </div>

      {error && (
        <div className={styles.card}>
          <div className={styles.cardTitle}>Error cargando datos</div>
          <div className={styles.cardSub}>{error}</div>
        </div>
      )}

      <div className={styles.metricsRow}>
        {metricas.map((m) => (
          <div key={m.label} className={styles.metricCard}>
            <div className={styles.metricLabel}>{m.label}</div>
            <div className={styles.metricValue}>
              {loading ? '...' : m.value}
            </div>
            <div className={styles.metricFooter}>
              <span
                className={`${styles.metricDelta} ${
                  m.up ? styles.deltaUp : styles.deltaDown
                }`}
              >
                {m.up ? '↑' : '↓'} {m.delta}
              </span>
              <span className={styles.metricSub}>{m.sub}</span>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.row2}>
        <div className={styles.card} style={{ flex: 2 }}>
          <div className={styles.cardHead}>
            <div>
              <div className={styles.cardTitle}>Tendencia de registros</div>
              <div className={styles.cardSub}>
                Proyección visual basada en el total real de la BD
              </div>
            </div>

            <div className={styles.bigNum}>
              <div className={styles.bigNumVal}>
                {loading ? '...' : total.toLocaleString('es-CO')}
              </div>
              <span className={styles.bigNumDelta}>
                ↑ Base consolidada Railway
              </span>
            </div>
          </div>

          <div className={styles.chartArea}>
            <div className={styles.barChart}>
              {trend.map((v, i) => (
                <div key={i} className={styles.barCol}>
                  <div
                    className={`${styles.bar} ${
                      i === trend.length - 1 ? styles.barActive : ''
                    }`}
                    style={{ height: `${(v / maxT) * 100}%` }}
                    title={`${days[i]}: ${v.toLocaleString('es-CO')}`}
                  />
                  <div className={styles.barLabel}>{days[i]}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.card} style={{ flex: 1 }}>
          <div className={styles.cardHead}>
            <div>
              <div className={styles.cardTitle}>Estado de votación</div>
              <div className={styles.cardSub}>
                {total.toLocaleString('es-CO')} registros totales
              </div>
            </div>
          </div>

          <div className={styles.cardBody}>
            {estados.map((e) => (
              <div key={e.label} className={styles.estadoRow}>
                <div className={styles.estadoInfo}>
                  <span
                    className={styles.estadoDot}
                    style={{ background: e.color }}
                  />
                  <span className={styles.estadoLabel}>{e.label}</span>
                </div>

                <div className={styles.estadoRight}>
                  <div className={styles.estadoTrack}>
                    <div
                      className={styles.estadoFill}
                      style={{
                        width: `${e.pct}%`,
                        background: e.color,
                      }}
                    />
                  </div>
                  <span className={styles.estadoPct}>{e.pct}%</span>
                  <span className={styles.estadoVal}>
                    {e.val.toLocaleString('es-CO')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.row2}>
        <div className={styles.card} style={{ flex: 1 }}>
          <div className={styles.cardHead}>
            <div>
              <div className={styles.cardTitle}>Distribución por municipio</div>
              <div className={styles.cardSub}>
                Total: {total.toLocaleString('es-CO')} registros
              </div>
            </div>
          </div>

          <div className={styles.cardBody}>
            {municipiosOrdenados.length === 0 && (
              <div className={styles.cardSub}>
                {loading ? 'Cargando municipios...' : 'No hay municipios registrados.'}
              </div>
            )}

            {municipiosOrdenados.map((m) => (
              <div key={m.name} className={styles.munRow}>
                <span className={styles.munName}>{m.name}</span>
                <div className={styles.munTrack}>
                  <div
                    className={styles.munFill}
                    style={{
                      width: `${m.pct}%`,
                      background: m.color,
                    }}
                  />
                </div>
                <span className={styles.munVal}>
                  {m.val.toLocaleString('es-CO')}
                </span>
                <span className={styles.munPct}>{m.pct}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.card} style={{ flex: 1 }}>
          <div className={styles.cardHead}>
            <div>
              <div className={styles.cardTitle}>Resumen de base</div>
              <div className={styles.cardSub}>
                Información calculada desde la tabla public.voluntarios
              </div>
            </div>
            <button className={styles.cardLink}>Ver todo</button>
          </div>

          <div className={styles.cardBody}>
            {[
              {
                name: 'Total registros',
                action: `${total.toLocaleString('es-CO')} personas cargadas`,
                time: 'BD',
                type: '#2563eb',
              },
              {
                name: 'Líderes',
                action: `${totalLideres.toLocaleString('es-CO')} registros marcados como líder`,
                time: 'Rol',
                type: '#d97706',
              },
              {
                name: 'Voluntarios',
                action: `${totalVoluntarios.toLocaleString('es-CO')} registros marcados como voluntario`,
                time: 'Rol',
                type: '#16a34a',
              },
              {
                name: 'Municipios',
                action: `${totalMunicipios.toLocaleString('es-CO')} municipios identificados`,
                time: 'Geo',
                type: '#7c3aed',
              },
            ].map((a, i) => (
              <div key={i} className={styles.actRow}>
                <div className={styles.actDot} style={{ background: a.type }} />
                <div className={styles.actBody}>
                  <div className={styles.actName}>{a.name}</div>
                  <div className={styles.actAction}>{a.action}</div>
                </div>
                <div className={styles.actTime}>{a.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHead}>
          <div>
            <div className={styles.cardTitle}>Registros recientes</div>
            <div className={styles.cardSub}>
              Primeros registros consultados desde Railway Voluntarios
            </div>
          </div>

          <button className={styles.btnOutline} style={{ fontSize: 12 }}>
            Ver base de datos →
          </button>
        </div>

        <table className={styles.table}>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Cédula</th>
              <th>Barrio</th>
              <th>Municipio</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {registrosRecientes.map((r, i) => (
              <tr key={`${r.cedula}-${i}`}>
                <td className={styles.tdName}>{r.nombre}</td>
                <td className={styles.tdMono}>{r.cedula}</td>
                <td>{r.barrio}</td>
                <td>{r.municipio}</td>
                <td>
                  <span
                    className={styles.estadoBadge}
                    style={{
                      color: r.sc,
                      background: r.sb,
                    }}
                  >
                    <span
                      className={styles.badgeDot}
                      style={{ background: r.sc }}
                    />
                    {r.estado}
                  </span>
                </td>
                <td>
                  <button className={styles.rowLink}>Ver →</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!loading && registrosRecientes.length === 0 && (
          <div style={{ padding: 20, color: '#64748b', fontSize: 13 }}>
            No hay registros para mostrar.
          </div>
        )}

        {loading && (
          <div style={{ padding: 20, color: '#64748b', fontSize: 13 }}>
            Cargando registros desde Railway...
          </div>
        )}
      </div>
    </div>
  );
}