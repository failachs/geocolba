'use client';

import styles from './MapControls.module.css';

interface Props {
  map: google.maps.Map | null;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onMyLocation: () => void;
  onFullscreen: () => void;
}

export default function MapControls({ onZoomIn, onZoomOut, onMyLocation, onFullscreen }: Props) {
  return (
    <div className={styles.group}>
      {/* Mi ubicación */}
      <button className={styles.roundBtn} onClick={onMyLocation} title="Mi ubicación">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
          <circle cx="12" cy="12" r="8" strokeWidth="1.5"/>
        </svg>
      </button>

      {/* Pantalla completa */}
      <button className={`${styles.roundBtn} ${styles.squareBtn}`} onClick={onFullscreen} title="Pantalla completa">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <polyline points="15 3 21 3 21 9"/>
          <polyline points="9 21 3 21 3 15"/>
          <line x1="21" y1="3" x2="14" y2="10"/>
          <line x1="3" y1="21" x2="10" y2="14"/>
        </svg>
      </button>

      {/* Zoom */}
      <div className={styles.zoomGroup}>
        <button className={styles.zoomBtn} onClick={onZoomIn} title="Acercar">+</button>
        <button className={styles.zoomBtn} onClick={onZoomOut} title="Alejar">−</button>
      </div>
    </div>
  );
}
