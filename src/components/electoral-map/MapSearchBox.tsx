'use client';

import { useMemo, useState } from 'react';
import type { ElectoralPoint } from '@/types/electoralMap';
import { CATEGORY_LABELS, MARKER_STYLES } from '@/data/mockElectoralPoints';
import styles from './MapSearchBox.module.css';

type Props = {
  points: ElectoralPoint[];
  total: number;
  onSelect: (point: ElectoralPoint) => void;
};

function normalizar(value?: string | number | null) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function iniciales(nombre?: string | null) {
  const partes = String(nombre || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (partes.length === 0) return '—';

  const a = partes[0]?.[0] || '';
  const b = partes.length > 1 ? partes[1]?.[0] || '' : '';

  return `${a}${b}`.toUpperCase();
}

export default function MapSearchBox({ points, total, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);

  const resultados = useMemo(() => {
    const q = normalizar(query);

    if (!q) return points.slice(0, 8);

    return points
      .filter((p) => {
        const texto = [
          p.nombre,
          p.cedula,
          p.celular,
          p.barrio,
          p.municipio,
          p.departamento,
          p.direccion,
          p.liderAsignado,
          p.puestoVotacion,
          p.estadoContacto,
          p.categoria,
        ]
          .map(normalizar)
          .join(' ');

        return texto.includes(q);
      })
      .slice(0, 8);
  }, [points, query]);

  const mostrarDropdown = focused && (query.trim().length > 0 || points.length > 0);

  const limpiar = () => {
    setQuery('');
  };

  const seleccionar = (point: ElectoralPoint) => {
    onSelect(point);
    setQuery(point.nombre || '');
    setFocused(false);
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.chip}>
        <span className={styles.chipDot} />
        <strong>{points.length.toLocaleString('es-CO')}</strong>
        <span>/ {total.toLocaleString('es-CO')} puntos visibles</span>
      </div>

      <div className={`${styles.inputWrap} ${focused ? styles.inputWrapFocused : ''}`}>
        <svg
          className={styles.searchIcon}
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>

        <input
          className={styles.input}
          value={query}
          onFocus={() => setFocused(true)}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre, cédula, barrio, municipio o líder…"
        />

        {query && (
          <button
            type="button"
            className={styles.clearBtn}
            onClick={limpiar}
            aria-label="Limpiar búsqueda"
          >
            ×
          </button>
        )}
      </div>

      {mostrarDropdown && (
        <div
          className={styles.dropdown}
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className={styles.dropdownHeader}>
            Resultados de búsqueda
          </div>

          {resultados.length > 0 ? (
            <>
              {resultados.map((point) => {
                const categoria = point.categoria;
                const markerStyle = MARKER_STYLES[categoria] || MARKER_STYLES.pendiente;
                const categoriaLabel = CATEGORY_LABELS[categoria] || categoria;

                return (
                  <button
                    key={point.id}
                    type="button"
                    className={styles.resultItem}
                    onClick={() => seleccionar(point)}
                  >
                    <span
                      className={styles.avatar}
                      style={{
                        background: markerStyle.bgColor,
                        color: markerStyle.textColor,
                      }}
                    >
                      {iniciales(point.nombre)}
                    </span>

                    <span className={styles.resultInfo}>
                      <span className={styles.resultName}>
                        {point.nombre || 'Sin nombre'}
                      </span>

                      <span className={styles.resultSub}>
                        {point.cedula || 'Sin cédula'} · {point.barrio || 'Sin barrio'} ·{' '}
                        {point.municipio || 'Sin municipio'}
                      </span>
                    </span>

                    <span
                      className={styles.catTag}
                      style={{
                        background: markerStyle.bgColor,
                        color: markerStyle.textColor,
                      }}
                    >
                      {categoriaLabel}
                    </span>

                    <svg
                      className={styles.arrowIcon}
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </button>
                );
              })}

              {points.length > resultados.length && (
                <div className={styles.moreHint}>
                  Escribe más datos para filtrar mejor los resultados.
                </div>
              )}
            </>
          ) : (
            <div className={styles.noResults}>
              <span>🔎</span>
              <span>
                No se encontraron resultados para <strong>{query}</strong>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}