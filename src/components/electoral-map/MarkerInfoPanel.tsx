'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import type { ElectoralPoint } from '@/types/electoralMap';
import { MARKER_STYLES, STATUS_STYLES } from '@/data/mockElectoralPoints';
import styles from './MarkerInfoPanel.module.css';

interface Props {
  point: ElectoralPoint | null;
  onClose: () => void;
  onOpenStreetView: (point: ElectoralPoint) => void;
  isLoaded: boolean;
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

const HISTORY = [
  { text: 'Contacto exitoso — confirmó asistencia', date: 'Hoy 10:22', color: '#22c55e' },
  { text: 'Visita domiciliaria realizada por voluntario', date: 'Hace 3 días', color: '#3b82f6' },
  { text: 'Registro inicial agregado al sistema', date: 'Hace 1 semana', color: '#a78bfa' },
];

export default function MarkerInfoPanel({ point, onClose, onOpenStreetView, isLoaded }: Props) {
  const miniMapRef   = useRef<HTMLDivElement>(null);
  const miniMapInst  = useRef<google.maps.Map | null>(null);
  const miniMarkerRef= useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

  // Build mini-map when point changes
  useEffect(() => {
    if (!isLoaded || !point || !miniMapRef.current) return;

    const initMiniMap = async () => {
      await google.maps.importLibrary('marker');

      // Remove previous
      if (miniMarkerRef.current) miniMarkerRef.current.map = null;

      if (!miniMapInst.current) {
        miniMapInst.current = new google.maps.Map(miniMapRef.current!, {
          zoom: 16,
          center: { lat: point.lat, lng: point.lng },
          mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID',
          disableDefaultUI: true,
          gestureHandling: 'none',
          zoomControl: false,
        });
      } else {
        miniMapInst.current.setCenter({ lat: point.lat, lng: point.lng });
      }

      const style  = MARKER_STYLES[point.categoria];
      const pinDiv = document.createElement('div');
      pinDiv.style.cssText = `width:16px;height:16px;border-radius:50%;background:${style.color};border:2.5px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)`;

      miniMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({
        map:      miniMapInst.current,
        position: { lat: point.lat, lng: point.lng },
        content:  pinDiv,
      });
    };

    initMiniMap();
  }, [isLoaded, point]);

  // Cleanup on unmount
  useEffect(() => () => {
    if (miniMarkerRef.current) miniMarkerRef.current.map = null;
  }, []);

  if (!point) return null;

  const catStyle    = MARKER_STYLES[point.categoria];
  const statusStyle = STATUS_STYLES[point.estadoContacto] ?? STATUS_STYLES['sin_validar'];
  const ini         = initials(point.nombre);

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${point.lat},${point.lng}`;

  return (
    <aside className={styles.panel}>
      {/* Head */}
      <div className={styles.head}>
        <button className={styles.backBtn} onClick={onClose} aria-label="Cerrar panel">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <span className={styles.headTitle}>{point.nombre}</span>
        <button className={styles.iconBtn} title="Ver ficha completa">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
          </svg>
        </button>
        <button className={styles.iconBtn} title="Editar">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
      </div>

      {/* Banner */}
      <div className={styles.banner}>
        <div className={styles.avatarRow}>
          <div className={styles.avatar} style={{ background: `linear-gradient(135deg, ${catStyle.color}cc, ${catStyle.color})` }}>
            {ini}
          </div>
          <div>
            <div className={styles.name}>{point.nombre}</div>
            <div className={styles.cedula}>
              {point.cedula ? `CC ${point.cedula}` : 'Sin cédula registrada'}
            </div>
          </div>
        </div>
        <div className={styles.badges}>
          <span className={styles.badge} style={{ background: statusStyle.bg, color: statusStyle.text }}>
            <span className={styles.badgeDot} style={{ background: statusStyle.dot }} />
            {point.estadoContacto.replace('_', ' ')}
          </span>
          <span className={styles.badge} style={{ background: catStyle.bgColor, color: catStyle.textColor }}>
            {catStyle.label} · {point.categoria.replace('_', ' ')}
          </span>
          {point.requiereTransporte && (
            <span className={styles.badge} style={{ background: 'rgba(14,165,233,.1)', color: '#0284c7' }}>
              🚌 Transporte
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className={styles.body}>
        {/* Ubicación */}
        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>Ubicación</h4>
          <Row label="Dirección"      value={point.direccion} />
          <Row label="Barrio"         value={point.barrio} />
          <Row label="Municipio"      value={`${point.municipio}, ${point.departamento}`} />
          {point.puestoVotacion && <Row label="Puesto de votación" value={point.puestoVotacion} small />}
        </section>

        {/* Contacto */}
        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>Contacto</h4>
          {point.celular && (
            <Row label="Celular" value={
              <a href={`tel:${point.celular}`} style={{ color: '#0ea5e9', textDecoration: 'none' }}>
                {point.celular}
              </a>
            } />
          )}
          {point.email && <Row label="Email" value={point.email} />}
          {point.liderAsignado && <Row label="Líder asignado" value={point.liderAsignado} />}
          {point.ultimoContacto && <Row label="Último contacto" value={point.ultimoContacto} />}
        </section>

        {/* Notas */}
        {point.notas && (
          <section className={styles.section}>
            <h4 className={styles.sectionTitle}>Notas</h4>
            <p className={styles.notes}>{point.notas}</p>
          </section>
        )}

        {/* Acciones rápidas */}
        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>Acciones rápidas</h4>
          <div className={styles.qaGrid}>
            <button
              className={styles.qaBtn}
              onClick={() => onOpenStreetView(point)}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              Street View
            </button>
            <a
              className={styles.qaBtn}
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                <polygon points="3 11 22 2 13 21 11 13 3 11"/>
              </svg>
              Cómo llegar
            </a>
            <button className={styles.qaBtn}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
              Compartir
            </button>
            <button className={styles.qaBtn}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Editar
            </button>
          </div>
        </section>

        {/* Historial */}
        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>Historial de contacto</h4>
          <div className={styles.history}>
            {HISTORY.map((h, i) => (
              <div key={i} className={styles.histItem}>
                <div className={styles.histDot} style={{ background: h.color }} />
                <div>
                  <div className={styles.histText}>{h.text}</div>
                  <div className={styles.histDate}>{h.date}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Mini mapa */}
        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>Ubicación en mapa</h4>
          <div ref={miniMapRef} className={styles.miniMap} />
        </section>
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <button className={styles.btnSecondary}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          Registrar interacción
        </button>
        <button className={styles.btnPrimary}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Confirmar asistencia
        </button>
      </div>
    </aside>
  );
}

/* ─── Helper Row ─────────────────────────────────────────────────────────── */
function Row({
  label,
  value,
  small,
}: {
  label: string;
  value: React.ReactNode;
  small?: boolean;
}) {
  return (
    <div className={styles.fieldRow}>
      <span className={styles.fieldLabel}>{label}</span>
      <span className={`${styles.fieldValue} ${small ? styles.fieldValueSm : ''}`}>{value}</span>
    </div>
  );
}