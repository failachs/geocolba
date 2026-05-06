'use client';

import { useState } from 'react';
import type { ElectoralPoint, MapFilters, MarkerCategory, ContactStatus } from '@/types/electoralMap';
import {
  MARKER_STYLES, CATEGORY_LABELS, STATUS_LABELS, STATUS_STYLES,
  MUNICIPIOS, LIDERES_LIST,
} from '@/data/mockElectoralPoints';
import styles from './MapSidebar.module.css';

interface Props {
  open: boolean;
  points: ElectoralPoint[];
  totalPoints: number;
  filters: MapFilters;
  onFilterChange: (f: MapFilters) => void;
  onPointSelect: (p: ElectoralPoint) => void;
}

export default function MapSidebar({
  open, points, totalPoints, filters, onFilterChange, onPointSelect,
}: Props) {

  const [filterSec, setFilterSec] = useState<Record<string, boolean>>({
    status: true, territorio: false, lider: false,
  });

  const toggleSec = (key: string) =>
    setFilterSec(prev => ({ ...prev, [key]: !prev[key] }));

  const countByCategory = (cat: MarkerCategory | 'todos') =>
    cat === 'todos'
      ? points.length
      : points.filter(p => p.categoria === cat).length;

  return (
    <aside className={`${styles.sidebar} ${!open ? styles.collapsed : ''}`}>
      {/* Logo */}
      <div className={styles.logo}>
        <div className={styles.logoMark}>C3</div>
        <div className={styles.logoText}>
          <div className={styles.logoName}>Campaña 360</div>
          <div className={styles.logoSub}>GeoCOLBA · Electoral 2026</div>
        </div>
      </div>

      {/* Nav */}
      <nav className={styles.nav}>
        <div className={styles.navSection}>Principal</div>
        <NavItem icon="📊" label="Dashboard" />
        <NavItem icon="📥" label="Importar datos" />
        <div className={styles.navSection}>Plan de campaña</div>
        <NavItem icon="👥" label="Personas" badge="4.2k" />
        <NavItem icon="🗺" label="Mapa Electoral" active />
        <NavItem icon="⬡" label="Territorios" />
        <NavItem icon="🔗" label="Integraciones" />
        <div className={styles.navSection}>Organización</div>
        <NavItem icon="🤝" label="Voluntarios" />
        <NavItem icon="🛣" label="Rutas" />
        <NavItem icon="📋" label="Encuestas" />
        <NavItem icon="🚌" label="Transporte" />
        <div className={styles.navSection}>Análisis</div>
        <NavItem icon="📈" label="Reportes" />
        <NavItem icon="🔍" label="Auditoría" />
      </nav>

      {/* Stats */}
      <div className={styles.statsSection}>
        <div className={styles.sectionLabel}>Estadísticas</div>
        <div className={styles.statsGrid}>
          <Stat label="Total puntos"   value={totalPoints} />
          <Stat label="Visibles"       value={points.length} accent />
          <Stat label="Confirmados"    value={points.filter(p => p.estadoContacto === 'confirmado').length} />
          <Stat label="Pendientes"     value={points.filter(p => p.estadoContacto === 'pendiente').length} />
        </div>
      </div>

      {/* Category legend + filter */}
      <div className={styles.legendSection}>
        <div className={styles.sectionLabel}>Filtrar por categoría</div>
        {(['todos', 'lider', 'votante', 'voluntario', 'punto_votacion', 'casa_visitada', 'pendiente'] as const).map(cat => (
          <button
            key={cat}
            className={`${styles.legendItem} ${filters.categoria === cat ? styles.legendItemActive : ''}`}
            onClick={() => onFilterChange({ ...filters, categoria: cat })}
          >
            <span
              className={styles.legendDot}
              style={{ background: cat === 'todos' ? '#6b7280' : MARKER_STYLES[cat].color }}
            />
            <span className={styles.legendName}>{CATEGORY_LABELS[cat]}</span>
            <span className={styles.legendCount}>{countByCategory(cat)}</span>
          </button>
        ))}
      </div>

      {/* Municipio filter */}
      <div className={styles.filterSection}>
        <div className={styles.sectionLabel}>Municipio</div>
        <select
          className={styles.select}
          value={filters.municipio}
          onChange={e => onFilterChange({ ...filters, municipio: e.target.value })}
        >
          {MUNICIPIOS.map(m => (
            <option key={m} value={m}>{m === 'todos' ? 'Todos los municipios' : m}</option>
          ))}
        </select>
      </div>

      {/* Estado de contacto filter */}
      <div className={styles.filterSection}>
        <div className={styles.sectionLabel}>Estado de contacto</div>
        <select
          className={styles.select}
          value={filters.estadoContacto}
          onChange={e => onFilterChange({ ...filters, estadoContacto: e.target.value as ContactStatus | 'todos' })}
        >
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <button
          className={styles.resetBtn}
          onClick={() => onFilterChange({
            categoria: 'todos', municipio: 'todos',
            estadoContacto: 'todos', lider: 'todos', requiereTransporte: null,
          })}
        >
          Limpiar filtros
        </button>
        <button className={styles.exportBtn}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Exportar
        </button>
      </div>
    </aside>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */
function NavItem({ icon, label, active, badge }: {
  icon: string; label: string; active?: boolean; badge?: string;
}) {
  return (
    <a className={`${styles.navItem} ${active ? styles.navItemActive : ''}`} href="#">
      <span className={styles.navIcon}>{icon}</span>
      <span className={styles.navLabel}>{label}</span>
      {badge && <span className={styles.navBadge}>{badge}</span>}
    </a>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={styles.statBox}>
      <div className={`${styles.statNum} ${accent ? styles.statNumAccent : ''}`}>
        {value.toLocaleString('es-CO')}
      </div>
      <div className={styles.statLbl}>{label}</div>
    </div>
  );
}
