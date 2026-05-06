'use client';

import type { ElectoralPoint } from '@/types/electoralMap';
import styles from './StreetViewPanel.module.css';

interface Props {
  loading: boolean;
  available: boolean | null;
  point: ElectoralPoint | null;
  onClose: () => void;
}

export default function StreetViewPanel({ loading, available, point, onClose }: Props) {
  // Si está disponible y no cargando, el div de Street View ya se muestra de Google
  // Este componente solo maneja los estados de carga y error
  if (!loading && available === true) return null;

  return (
    <div className={styles.overlay} role="dialog" aria-label="Street View">
      {/* Topbar (siempre visible) */}
      <div className={styles.topbar}>
        <button className={styles.closeBtn} onClick={onClose}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Volver al mapa
        </button>
        {point && (
          <span className={styles.address}>{point.direccion}, {point.municipio}</span>
        )}
        <span className={styles.tag}>Street View</span>
      </div>

      {/* Estado de carga */}
      {loading && (
        <div className={styles.stateCenter}>
          <div className={styles.spinner} />
          <p>Buscando panorama disponible…</p>
        </div>
      )}

      {/* Sin cobertura */}
      {!loading && available === false && (
        <div className={styles.stateCenter}>
          <div className={styles.noIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10"/>
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
            </svg>
          </div>
          <h3>Sin cobertura de Street View</h3>
          <p>No hay panorama disponible para esta ubicación.<br/>Intenta con otra dirección cercana.</p>
          <button className={styles.retryBtn} onClick={onClose}>Volver al mapa</button>
        </div>
      )}

      {/* Sin verificar (estado inicial) */}
      {!loading && available === null && (
        <div className={styles.stateCenter}>
          <div className={styles.spinner} />
          <p>Iniciando Street View…</p>
        </div>
      )}
    </div>
  );
}
