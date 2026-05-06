'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './usuarios.module.css';

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

type ApiResponse = {
  ok: boolean;
  data: VoluntarioApi[];
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

type UsuarioFicha = {
  uid: string;
  id: string;
  cedula: string;
  nombre: string;
  email: string;
  telefono1: string;
  telefono2: string;
  direccion: string;
  barrio: string;
  municipio: string;
  departamento: string;
  rol: 'Líder Zonal' | 'Voluntario';
  estado: 'activo' | 'inactivo' | 'pendiente';
  avatar: string;
  registros: number;
  asignadoOriginal: string;
  estadoOriginal: string;
};

const ROLES = ['Todos', 'Líder Zonal', 'Voluntario'];

const ROL_COLORS: Record<string, { bg: string; text: string }> = {
  'Líder Zonal': { bg: '#fefce8', text: '#a16207' },
  Voluntario: { bg: '#f0fdf4', text: '#15803d' },
};

const ESTADO_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  activo: { bg: '#f0fdf4', text: '#15803d', dot: '#22c55e' },
  inactivo: { bg: '#f9fafb', text: '#374151', dot: '#6b7280' },
  pendiente: { bg: '#fffbeb', text: '#b45309', dot: '#f59e0b' },
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

function getIniciales(nombre: string) {
  const partes = nombre
    .split(' ')
    .map((p) => p.trim())
    .filter(Boolean);

  if (partes.length === 0) return '—';

  const primera = partes[0]?.[0] || '';
  const segunda = partes.length > 1 ? partes[1]?.[0] || '' : '';

  return `${primera}${segunda}`.toUpperCase();
}

function getRol(asignado?: string | null): 'Líder Zonal' | 'Voluntario' {
  const value = normalizar(asignado);

  if (value.includes('lider') || value.includes('líder')) {
    return 'Líder Zonal';
  }

  return 'Voluntario';
}

function getEstado(estado?: string | null): 'activo' | 'inactivo' | 'pendiente' {
  const value = normalizar(estado);

  if (!value) return 'pendiente';

  if (
    value.includes('pendiente') ||
    value.includes('no voto') ||
    value.includes('no votó') ||
    value === 'no'
  ) {
    return 'pendiente';
  }

  if (
    value.includes('inactivo') ||
    value.includes('rechaza') ||
    value.includes('retirado')
  ) {
    return 'inactivo';
  }

  return 'activo';
}

function construirUsuario(v: VoluntarioApi, conteoPorAsignado: Record<string, number>): UsuarioFicha {
  const nombre =
    texto(v.nombre_completo) ||
    [texto(v.nombres_completos), texto(v.apellidos_completos)].filter(Boolean).join(' ') ||
    'Sin nombre';

  const asignadoOriginal = texto(v.asignado);
  const estadoOriginal = texto(v.estado);

  const rol = getRol(v.asignado);
  const estado = getEstado(v.estado);

  const claveAsignado = normalizar(v.asignado) || normalizar(rol);
  const registros = conteoPorAsignado[claveAsignado] || 1;

  return {
    uid: String(v.uid || v.id || v.cedula || crypto.randomUUID()),
    id: texto(v.id || v.uid),
    cedula: texto(v.cedula),
    nombre,
    email: texto(v.correo),
    telefono1: texto(v.telefono_1),
    telefono2: texto(v.telefono_2),
    direccion: texto(v.direccion),
    barrio: texto(v.barrio),
    municipio: texto(v.municipio),
    departamento: texto(v.departamento),
    rol,
    estado,
    avatar: getIniciales(nombre),
    registros,
    asignadoOriginal,
    estadoOriginal,
  };
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<UsuarioFicha[]>([]);
  const [totalBase, setTotalBase] = useState(0);

  const [search, setSearch] = useState('');
  const [rolFilter, setRolFilter] = useState('Todos');

  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<UsuarioFicha | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function cargarUsuarios() {
      try {
        setLoading(true);
        setError('');

        const res = await fetch('/api/voluntarios/listar?page=1&limit=5000', {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal,
        });

        const json: ApiResponse = await res.json();

        if (!res.ok || !json.ok) {
          throw new Error(json.error || 'No fue posible cargar usuarios desde la base de datos.');
        }

        const voluntarios = Array.isArray(json.data) ? json.data : [];

        const conteoPorAsignado = voluntarios.reduce<Record<string, number>>((acc, item) => {
          const rol = getRol(item.asignado);
          const clave = normalizar(item.asignado) || normalizar(rol);
          acc[clave] = (acc[clave] || 0) + 1;
          return acc;
        }, {});

        const usuariosDesdeBd = voluntarios.map((v) =>
          construirUsuario(v, conteoPorAsignado)
        );

        setUsuarios(usuariosDesdeBd);
        setTotalBase(json.pagination?.total || json.stats?.total || usuariosDesdeBd.length);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;

        const message =
          err instanceof Error ? err.message : 'Error cargando usuarios desde Railway.';

        setError(message);
        setUsuarios([]);
        setTotalBase(0);
      } finally {
        setLoading(false);
      }
    }

    cargarUsuarios();

    return () => controller.abort();
  }, []);

  const filtered = useMemo(() => {
    return usuarios.filter((u) => {
      const q = normalizar(search);

      if (
        q &&
        !normalizar(u.nombre).includes(q) &&
        !normalizar(u.email).includes(q) &&
        !normalizar(u.cedula).includes(q) &&
        !normalizar(u.telefono1).includes(q) &&
        !normalizar(u.municipio).includes(q) &&
        !normalizar(u.barrio).includes(q)
      ) {
        return false;
      }

      if (rolFilter !== 'Todos' && u.rol !== rolFilter) {
        return false;
      }

      return true;
    });
  }, [usuarios, search, rolFilter]);

  const totalLideres = useMemo(
    () => usuarios.filter((u) => u.rol === 'Líder Zonal').length,
    [usuarios]
  );

  const totalVoluntarios = useMemo(
    () => usuarios.filter((u) => u.rol === 'Voluntario').length,
    [usuarios]
  );

  const abrirFicha = (usuario: UsuarioFicha) => {
    setSelected(usuario);
    setShowModal(true);
  };

  const cerrarFicha = () => {
    setSelected(null);
    setShowModal(false);
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Usuarios y perfiles</h1>
          <p className={styles.subtitle}>
            {loading
              ? 'Cargando usuarios desde la base de datos...'
              : `${filtered.length.toLocaleString('es-CO')} usuarios visibles · ${totalBase.toLocaleString('es-CO')} registros en BD · ${totalLideres.toLocaleString('es-CO')} líderes · ${totalVoluntarios.toLocaleString('es-CO')} voluntarios`}
          </p>
        </div>

        <button
          className={styles.btnPrimary}
          onClick={() => {
            setSelected(null);
            setShowModal(true);
          }}
          title="La creación de usuarios requiere una API de escritura."
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nuevo usuario
        </button>
      </div>

      {/* Filtros */}
      <div className={styles.filters}>
        <div className={styles.searchWrap}>
          <svg
            className={styles.searchIcon}
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>

          <input
            className={styles.searchInput}
            placeholder="Buscar por nombre, cédula, email, barrio, celular…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className={styles.rolTabs}>
          {ROLES.map((r) => (
            <button
              key={r}
              type="button"
              className={`${styles.rolTab} ${rolFilter === r ? styles.rolTabActive : ''}`}
              onClick={() => setRolFilter(r)}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className={styles.tableWrap}>
          <div style={{ padding: 24, color: '#dc2626', fontSize: 13 }}>
            {error}
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Rol</th>
              <th>Municipio</th>
              <th>Registros</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((u) => {
              const es = ESTADO_COLORS[u.estado];
              const rs = ROL_COLORS[u.rol];

              return (
                <tr key={u.uid}>
                  <td>
                    <div className={styles.userCell}>
                      <div className={styles.avatar}>{u.avatar}</div>
                      <div>
                        <div className={styles.userName}>{u.nombre}</div>
                        <div className={styles.userEmail}>
                          {u.email || u.cedula || 'Sin correo registrado'}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td>
                    <span
                      className={styles.badge}
                      style={{ background: rs.bg, color: rs.text }}
                    >
                      {u.rol}
                    </span>
                  </td>

                  <td>
                    <span className={styles.mun}>
                      {u.municipio || 'Sin municipio'}
                    </span>
                  </td>

                  <td>
                    <span className={styles.num}>{u.registros}</span>
                  </td>

                  <td>
                    <span
                      className={styles.estadoBadge}
                      style={{ background: es.bg, color: es.text }}
                    >
                      <span
                        className={styles.estadoDot}
                        style={{ background: es.dot }}
                      />
                      {u.estado.charAt(0).toUpperCase() + u.estado.slice(1)}
                    </span>
                  </td>

                  <td>
                    <div className={styles.rowActions}>
                      <button
                        className={styles.rowBtn}
                        onClick={() => abrirFicha(u)}
                      >
                        Ver ficha
                      </button>

                      <button
                        className={`${styles.rowBtn} ${styles.rowBtnDanger}`}
                        disabled
                        title="Para desactivar se requiere una API PATCH/PUT."
                      >
                        Desactivar
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {!loading && filtered.length === 0 && (
          <div style={{ padding: 24, color: '#94a3b8', fontSize: 13 }}>
            No hay usuarios con los filtros aplicados.
          </div>
        )}

        {loading && (
          <div style={{ padding: 24, color: '#94a3b8', fontSize: 13 }}>
            Cargando usuarios desde Railway...
          </div>
        )}
      </div>

      {/* Modal ficha usuario */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={cerrarFicha}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <span className={styles.modalTitle}>
                {selected ? 'Ficha del usuario' : 'Nuevo usuario'}
              </span>
              <button className={styles.modalClose} onClick={cerrarFicha}>
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              {selected ? (
                <div className={styles.formGrid}>
                  <div className={styles.field}>
                    <label>Nombre completo</label>
                    <input type="text" value={selected.nombre} readOnly />
                  </div>

                  <div className={styles.field}>
                    <label>Cédula</label>
                    <input type="text" value={selected.cedula || 'No registra'} readOnly />
                  </div>

                  <div className={styles.field}>
                    <label>Email</label>
                    <input type="email" value={selected.email || 'No registra'} readOnly />
                  </div>

                  <div className={styles.field}>
                    <label>Teléfono 1</label>
                    <input type="text" value={selected.telefono1 || 'No registra'} readOnly />
                  </div>

                  <div className={styles.field}>
                    <label>Teléfono 2</label>
                    <input type="text" value={selected.telefono2 || 'No registra'} readOnly />
                  </div>

                  <div className={styles.field}>
                    <label>Rol</label>
                    <input type="text" value={selected.rol} readOnly />
                  </div>

                  <div className={styles.field}>
                    <label>Asignado original</label>
                    <input
                      type="text"
                      value={selected.asignadoOriginal || 'No registra'}
                      readOnly
                    />
                  </div>

                  <div className={styles.field}>
                    <label>Estado</label>
                    <input
                      type="text"
                      value={selected.estadoOriginal || selected.estado}
                      readOnly
                    />
                  </div>

                  <div className={styles.field}>
                    <label>Departamento</label>
                    <input
                      type="text"
                      value={selected.departamento || 'No registra'}
                      readOnly
                    />
                  </div>

                  <div className={styles.field}>
                    <label>Municipio</label>
                    <input
                      type="text"
                      value={selected.municipio || 'No registra'}
                      readOnly
                    />
                  </div>

                  <div className={styles.field}>
                    <label>Barrio</label>
                    <input type="text" value={selected.barrio || 'No registra'} readOnly />
                  </div>

                  <div className={styles.field}>
                    <label>Dirección</label>
                    <input
                      type="text"
                      value={selected.direccion || 'No registra'}
                      readOnly
                    />
                  </div>
                </div>
              ) : (
                <div className={styles.formGrid}>
                  <div className={styles.field}>
                    <label>Nombre completo</label>
                    <input type="text" placeholder="Disponible cuando se cree la API de escritura" disabled />
                  </div>

                  <div className={styles.field}>
                    <label>Email</label>
                    <input type="email" placeholder="correo@dominio.co" disabled />
                  </div>

                  <div className={styles.field}>
                    <label>Rol</label>
                    <select disabled>
                      <option>Líder Zonal</option>
                      <option>Voluntario</option>
                    </select>
                  </div>

                  <div className={styles.field}>
                    <label>Municipio</label>
                    <input type="text" placeholder="Municipio" disabled />
                  </div>

                  <div className={styles.field}>
                    <label>Estado</label>
                    <select disabled>
                      <option value="activo">Activo</option>
                      <option value="inactivo">Inactivo</option>
                      <option value="pendiente">Pendiente</option>
                    </select>
                  </div>

                  <div className={styles.field}>
                    <label>Contraseña</label>
                    <input type="password" placeholder="••••••••" disabled />
                  </div>

                  <div
                    style={{
                      gridColumn: '1 / -1',
                      fontSize: 12,
                      color: '#64748b',
                      lineHeight: 1.5,
                    }}
                  >
                    Este formulario está bloqueado porque la pantalla actualmente solo consulta
                    información desde la tabla <strong>public.voluntarios</strong>. Para crear o
                    editar usuarios se debe implementar una API de escritura.
                  </div>
                </div>
              )}
            </div>

            <div className={styles.modalFoot}>
              <button className={styles.btnSecondary} onClick={cerrarFicha}>
                Cerrar
              </button>

              {selected ? (
                <button className={styles.btnPrimary} onClick={cerrarFicha}>
                  Aceptar
                </button>
              ) : (
                <button className={styles.btnPrimary} disabled>
                  Crear usuario
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}