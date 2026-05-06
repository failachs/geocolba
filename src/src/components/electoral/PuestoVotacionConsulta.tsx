'use client';

import { useState } from 'react';
import styles from './PuestoVotacionConsulta.module.css';

interface PuestoData {
  nuip: string; nombre?: string; departamento: string; municipio: string;
  puesto: string; direccion: string; mesa: string; zona?: string;
  novedad?: string; fechaNovedad?: string; resolucion?: string;
}

type Estado = 'idle' | 'cargando' | 'ok' | 'error';

export default function PuestoVotacionConsulta() {
  const [cedula,   setCedula]   = useState('');
  const [fecha,    setFecha]    = useState('');
  const [estado,   setEstado]   = useState<Estado>('idle');
  const [data,     setData]     = useState<PuestoData | null>(null);
  const [mensaje,  setMensaje]  = useState('');
  const [fuente,   setFuente]   = useState('');
  const [errCed,   setErrCed]   = useState('');
  const [errFecha, setErrFecha] = useState('');

  const handleCedula = (v: string) => { setCedula(v.replace(/\D/g, '')); setErrCed(''); };
  const handleFecha  = (v: string) => { setFecha(v); setErrFecha(''); };

  const validar = (): boolean => {
    let ok = true;
    if (!cedula || cedula.length < 5) { setErrCed('Ingresa una cédula válida (mínimo 5 dígitos).'); ok = false; }
    if (!fecha) { setErrFecha('La fecha de nacimiento es requerida.'); ok = false; }
    return ok;
  };

  const consultar = async () => {
    if (!validar()) return;
    setEstado('cargando'); setData(null); setMensaje(''); setFuente('');

    try {
      const res  = await fetch('/api/puesto-votacion', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ cedula, fechaNacimiento: fecha }),
      });
      const json = await res.json();

      if (json.ok) {
        setData(json.data);
        setFuente(json.fuente || '');
        setEstado('ok');
      } else {
        setMensaje(json.mensaje || 'No se encontró información.');
        setEstado('error');
      }
    } catch {
      setMensaje('Error de conexión. Verifica tu internet e intenta de nuevo.');
      setEstado('error');
    }
  };

  const limpiar = () => {
    setCedula(''); setFecha(''); setEstado('idle');
    setData(null); setMensaje(''); setFuente('');
    setErrCed(''); setErrFecha('');
  };

  return (
    <div className={styles.wrapper}>

      {/* ── Formulario ───────────────────────────────── */}
      <div className={styles.form}>
        <p className={styles.formTitle}>Datos del ciudadano</p>

        {/* Cédula */}
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Número de cédula</label>
          <input className={`${styles.input} ${errCed ? styles.inputError : ''}`}
            type="text" inputMode="numeric" maxLength={12}
            placeholder="Ej: 1143451001"
            value={cedula} onChange={e => handleCedula(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && consultar()}
            disabled={estado === 'cargando'}/>
          {errCed && <span className={styles.fieldError}>{errCed}</span>}
        </div>

        {/* Fecha nacimiento */}
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Fecha de nacimiento</label>
          <input className={`${styles.input} ${errFecha ? styles.inputError : ''}`}
            type="date" value={fecha}
            onChange={e => handleFecha(e.target.value)}
            disabled={estado === 'cargando'}
            max={new Date().toISOString().split('T')[0]}/>
          {errFecha && <span className={styles.fieldError}>{errFecha}</span>}
        </div>

        <button className={styles.btnConsultar} onClick={consultar}
          disabled={estado === 'cargando' || !cedula || !fecha}>
          {estado === 'cargando'
            ? <><span className={styles.btnSpinner}/> Consultando…</>
            : <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                Consultar puesto de votación
              </>
          }
        </button>

        <div className={styles.legalNote}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <span>
            <strong>Ley 1581/2012 —</strong> Consulta información pública del censo electoral.
            Realiza esta consulta solo con autorización del titular de los datos.
          </span>
        </div>
      </div>

      {/* ── Cargando ─────────────────────────────────── */}
      {estado === 'cargando' && (
        <div className={styles.loadingCard}>
          <div className={styles.spinner}/>
          <p className={styles.loadingText}>Consultando Registraduría Nacional…</p>
          <p className={styles.loadingSubtext}>Esto puede tardar unos segundos</p>
        </div>
      )}

      {/* ── Error ────────────────────────────────────── */}
      {estado === 'error' && (
        <div className={styles.errorCard}>
          <div className={styles.errorCardIcon}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <div>
            <p className={styles.errorCardTitle}>No se obtuvo resultado</p>
            <p className={styles.errorCardMsg}>{mensaje}</p>
            <button className={styles.btnRetry} onClick={limpiar}>Intentar de nuevo</button>
          </div>
        </div>
      )}

      {/* ── Resultado ────────────────────────────────── */}
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
              <p className={styles.resultHeadSub}>
                {[data.municipio, data.departamento].filter(Boolean).join(' · ')}
              </p>
            </div>
            {fuente && (
              <span className={styles.fuenteBadge}>
                {fuente === 'registraduria' ? 'Registraduría' : 'Apitude'}
              </span>
            )}
          </div>

          <div className={styles.resultBody}>

            {/* Identificación */}
            <div className={styles.resultSection}>
              <p className={styles.resultSectionTitle}>Identificación</p>
              <div className={styles.resultGrid}>
                <div>
                  <div className={styles.resultLabel}>NUIP / Cédula</div>
                  <div className={styles.resultValueMono}>{data.nuip || cedula}</div>
                </div>
                {data.nombre && (
                  <div>
                    <div className={styles.resultLabel}>Nombre</div>
                    <div className={styles.resultValue}>{data.nombre}</div>
                  </div>
                )}
                <div>
                  <div className={styles.resultLabel}>Mesa</div>
                  {data.mesa
                    ? <span className={styles.mesaChip}>{data.mesa}</span>
                    : <span className={styles.resultValueEmpty}>—</span>}
                </div>
                {data.zona && (
                  <div>
                    <div className={styles.resultLabel}>Zona</div>
                    <div className={styles.resultValue}>{data.zona}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Ubicación */}
            <div className={styles.resultSection}>
              <p className={styles.resultSectionTitle}>Ubicación del puesto</p>
              <div className={styles.resultGrid}>
                <div>
                  <div className={styles.resultLabel}>Departamento</div>
                  <div className={styles.resultValue}>{data.departamento || '—'}</div>
                </div>
                <div>
                  <div className={styles.resultLabel}>Municipio</div>
                  <div className={styles.resultValue}>{data.municipio || '—'}</div>
                </div>
              </div>
              <div style={{marginTop:10}}>
                <div className={styles.resultLabel}>Dirección</div>
                <div className={styles.resultValue}>{data.direccion || '—'}</div>
              </div>
            </div>

            {/* Novedad (si existe) */}
            {(data.novedad || data.resolucion) && (
              <div className={styles.resultSection}>
                <p className={styles.resultSectionTitle}>Novedades</p>
                <div className={styles.resultGrid}>
                  <div>
                    <div className={styles.resultLabel}>Novedad</div>
                    <span className={`${styles.novedadBadge} ${data.novedad ? styles.novedadSi : styles.novedadNo}`}>
                      {data.novedad || 'Sin novedad'}
                    </span>
                  </div>
                  {data.fechaNovedad && (
                    <div>
                      <div className={styles.resultLabel}>Fecha novedad</div>
                      <div className={styles.resultValueMono}>{data.fechaNovedad}</div>
                    </div>
                  )}
                </div>
                {data.resolucion && (
                  <div style={{marginTop:8}}>
                    <div className={styles.resultLabel}>Resolución</div>
                    <div className={styles.resultValueMono}>{data.resolucion}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className={styles.resultFooter}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <path d="M9 12l2 2 4-4"/>
            </svg>
            Consulta realizada · Registraduría Nacional del Estado Civil
            <button onClick={limpiar} className={styles.btnNueva}>Nueva consulta</button>
          </div>
        </div>
      )}
    </div>
  );
}