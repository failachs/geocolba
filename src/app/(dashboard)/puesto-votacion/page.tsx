'use client';

import { useState } from 'react';
import styles from './puesto-votacion.module.css';

interface PuestoData {
  nuip: string; nombre?: string; departamento: string; municipio: string;
  puesto: string; direccion: string; mesa: string; zona?: string;
  novedad?: string; fechaNovedad?: string; resolucion?: string;
}
type Estado = 'idle' | 'cargando' | 'ok' | 'error';

export default function PuestoVotacionPage() {
  const [cedula,   setCedula]   = useState('');
  const [fecha,    setFecha]    = useState('');
  const [estado,   setEstado]   = useState<Estado>('idle');
  const [data,     setData]     = useState<PuestoData | null>(null);
  const [mensaje,  setMensaje]  = useState('');
  const [fuente,   setFuente]   = useState('');
  const [errCed,   setErrCed]   = useState('');
  const [errFecha, setErrFecha] = useState('');

  const consultar = async () => {
    setErrCed(''); setErrFecha('');
    if (!cedula || cedula.length < 5) { setErrCed('Ingresa una cédula válida.'); return; }
    if (!fecha) { setErrFecha('La fecha de nacimiento es requerida.'); return; }
    setEstado('cargando'); setData(null); setMensaje('');
    try {
      const res  = await fetch('/api/puesto-votacion', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cedula, fechaNacimiento: fecha }),
      });
      const json = await res.json();
      if (json.ok) { setData(json.data); setFuente(json.fuente || ''); setEstado('ok'); }
      else { setMensaje(json.mensaje || 'No se encontró información.'); setEstado('error'); }
    } catch { setMensaje('Error de conexión.'); setEstado('error'); }
  };

  const limpiar = () => {
    setCedula(''); setFecha(''); setEstado('idle');
    setData(null); setMensaje(''); setErrCed(''); setErrFecha('');
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Puesto de votación</h1>
        <p className={styles.subtitle}>Consulta el puesto usando cédula y fecha de nacimiento · <strong>Registraduría Nacional</strong></p>
      </div>

      <div className={styles.card}>
        <p className={styles.cardTitle}>Datos del ciudadano</p>

        <div className={styles.field}>
          <label className={styles.label}>Número de cédula</label>
          <input className={`${styles.input} ${errCed ? styles.inputErr : ''}`}
            type="text" inputMode="numeric" maxLength={12}
            placeholder="Ej: 1143451001"
            value={cedula} onChange={e => setCedula(e.target.value.replace(/\D/g,''))}
            onKeyDown={e => e.key === 'Enter' && consultar()}
            disabled={estado === 'cargando'}/>
          {errCed && <span className={styles.errMsg}>{errCed}</span>}
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Fecha de nacimiento</label>
          <input className={`${styles.input} ${errFecha ? styles.inputErr : ''}`}
            type="date" value={fecha}
            onChange={e => setFecha(e.target.value)}
            disabled={estado === 'cargando'}
            max={new Date().toISOString().split('T')[0]}/>
          {errFecha && <span className={styles.errMsg}>{errFecha}</span>}
        </div>

        <button className={styles.btn} onClick={consultar}
          disabled={estado === 'cargando' || !cedula || !fecha}>
          {estado === 'cargando'
            ? <><span className={styles.btnSpinner}/>Consultando…</>
            : <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                Consultar puesto de votación
              </>
          }
        </button>

        <div className={styles.legal}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <span><strong>Ley 1581/2012 —</strong> Solo con autorización del titular de los datos.</span>
        </div>
      </div>

      {estado === 'cargando' && (
        <div className={styles.loadingCard}>
          <div className={styles.spinner}/>
          <p className={styles.loadingText}>Consultando Registraduría Nacional…</p>
          <p className={styles.loadingSub}>Esto puede tardar unos segundos</p>
        </div>
      )}

      {estado === 'error' && (
        <div className={styles.errorCard}>
          <div className={styles.errorIcon}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <div>
            <p className={styles.errorTitle}>No se obtuvo resultado</p>
            <p className={styles.errorMsg}>{mensaje}</p>
            <button className={styles.btnRetry} onClick={limpiar}>Intentar de nuevo</button>
          </div>
        </div>
      )}

      {estado === 'ok' && data && (
        <div className={styles.resultCard}>
          <div className={styles.resultHead}>
            <div className={styles.resultHeadIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <div>
              <p className={styles.resultHeadTitle}>{data.puesto || 'Puesto de votación'}</p>
              <p className={styles.resultHeadSub}>{[data.municipio, data.departamento].filter(Boolean).join(' · ')}</p>
            </div>
            {fuente && <span className={styles.fuenteBadge}>{fuente === 'registraduria' ? 'Registraduría' : 'Apitude'}</span>}
          </div>

          <div className={styles.resultBody}>
            <div className={styles.section}>
              <p className={styles.sectionTitle}>Identificación</p>
              <div className={styles.grid}>
                <div><div className={styles.rLabel}>NUIP / Cédula</div><div className={styles.rMono}>{data.nuip || cedula}</div></div>
                {data.nombre && <div><div className={styles.rLabel}>Nombre</div><div className={styles.rVal}>{data.nombre}</div></div>}
                <div><div className={styles.rLabel}>Mesa</div>{data.mesa ? <span className={styles.mesaChip}>{data.mesa}</span> : <span className={styles.rEmpty}>—</span>}</div>
                {data.zona && <div><div className={styles.rLabel}>Zona</div><div className={styles.rVal}>{data.zona}</div></div>}
              </div>
            </div>

            <div className={styles.section}>
              <p className={styles.sectionTitle}>Ubicación del puesto</p>
              <div className={styles.grid}>
                <div><div className={styles.rLabel}>Departamento</div><div className={styles.rVal}>{data.departamento || '—'}</div></div>
                <div><div className={styles.rLabel}>Municipio</div><div className={styles.rVal}>{data.municipio || '—'}</div></div>
              </div>
              <div style={{marginTop:10}}>
                <div className={styles.rLabel}>Dirección</div>
                <div className={styles.rVal}>{data.direccion || '—'}</div>
              </div>
            </div>

            {(data.novedad || data.resolucion) && (
              <div className={styles.section}>
                <p className={styles.sectionTitle}>Novedades</p>
                <span className={`${styles.novedadBadge} ${data.novedad ? styles.novedadSi : styles.novedadNo}`}>
                  {data.novedad || 'Sin novedad'}
                </span>
              </div>
            )}
          </div>

          <div className={styles.resultFooter}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <path d="M9 12l2 2 4-4"/>
            </svg>
            Registraduría Nacional del Estado Civil
            <button onClick={limpiar} className={styles.btnNueva}>Nueva consulta</button>
          </div>
        </div>
      )}
    </div>
  );
}