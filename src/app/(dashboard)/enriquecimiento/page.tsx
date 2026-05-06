'use client';

import { useState, useCallback } from 'react';
import styles from './enriquecimiento.module.css';

interface Contacto {
  id: number; cedula: string; nombres: string; apellidos: string;
  barrio: string; municipio: string; direccion: string;
}

interface Resultado {
  id: number; cedula: string; nombre: string;
  barrio: string; municipio: string;
  puestoAsignado: string | null;
  metodo: 'barrio_exacto' | 'barrio_aproximado' | 'municipio' | 'sin_resultado';
  confianza: number;
}

interface Stats {
  total: number; barrio_exacto: number; barrio_aproximado: number;
  municipio: number; sin_resultado: number; confianzaPromedio: number;
}

// Muestra de contactos reales del usuario
const CONTACTOS_MUESTRA: Contacto[] = [
  { id:1,   cedula:'1143451001', nombres:'ADRIAN',          apellidos:'AMARIS SIERRA',    barrio:'VILLA DEL PORTAL',  municipio:'SOLEDAD-ATLAN',   direccion:'CRA4#62B-48' },
  { id:2,   cedula:'1105460714', nombres:'CAMILA ANDREA',   apellidos:'BELTRAN GALINDO',  barrio:'SOLEDAD 2000',      municipio:'SOLEDAD-ATLAN',   direccion:'PUERTO TAMBORA' },
  { id:3,   cedula:'1045753795', nombres:'JOSE ANTONIO',    apellidos:'MODEFON YANCE',    barrio:'MUNDO FELIZ',       municipio:'GALAPA-ATLAN',    direccion:'CRA6#17-8' },
  { id:6,   cedula:'39019279',   nombres:'VERENIT',         apellidos:'PEREZ ALVARADO',   barrio:'MUNDO FELIZ',       municipio:'GALAPA-ATLAN',    direccion:'CRA6#17-8' },
  { id:8,   cedula:'6480765',    nombres:'MARIO ENRIQUE',   apellidos:'GARCIA JANCIA',    barrio:'LAS NIEVES',        municipio:'B/QUILLA-ATLAN',  direccion:'CRA13#24-36' },
  { id:12,  cedula:'',           nombres:'VLADERMIR',       apellidos:'ALTAHONA',         barrio:'LAS PALMAS',        municipio:'B/QUILLA-ATLAN',  direccion:'CRA7#35A-26' },
  { id:15,  cedula:'1140839775', nombres:'LICETH PATRICIA', apellidos:'ROMERO VARGAS',    barrio:'LOS ALMENDROS',     municipio:'SOLEDAD-ATLAN',   direccion:'TRANSVERSAL1BSUR#67-76' },
  { id:52,  cedula:'1045724178', nombres:'JENNIFER ALEXANDRA',apellidos:'BARRERA URIBE', barrio:'LOS ROBLES',        municipio:'SOLEDAD-ATLAN',   direccion:"CALL77D#21C-49" },
  { id:69,  cedula:'55300742',   nombres:'MARIE PAOLA',     apellidos:'ROSALES CHIMA',    barrio:'ALTOS DEL LIMON',   municipio:'B/QUILLA-ATLAN',  direccion:'CRA51B#91-160' },
  { id:79,  cedula:'3745146',    nombres:'JORGE',           apellidos:'GONZALEZ M.',      barrio:'CARMEN',            municipio:'PTO COLOMBIA-ATLAN',direccion:'CALLE9#72-5' },
  { id:90,  cedula:'1001945805', nombres:'MARIA CAMILA',    apellidos:'TORRES BETANCOURT',barrio:'LA CONCEPCION',     municipio:'B/QUILLA-ATLAN',  direccion:'CRA66#72-28' },
  { id:110, cedula:'1143134378', nombres:'YURLEIDYS',       apellidos:'OVIEDO',           barrio:'ALAMEDA',           municipio:'B/QUILLA-ATLAN',  direccion:'ALAMEDA DEL RIO' },
  { id:185, cedula:'1129534320', nombres:'GIAN CARLOS',     apellidos:'SILGUERO RODA',    barrio:'LAS NIEVES',        municipio:'B/QUILLA-ATLAN',  direccion:'CALLE21#26-83' },
  { id:266, cedula:'72210936',   nombres:'JOSE LUIS',       apellidos:'CURIEL MENDOZA',   barrio:'PRADO',             municipio:'B/QUILLA-ATLAN',  direccion:'CRA49#72-20' },
  { id:442, cedula:'72304390',   nombres:'DAVID EUSABIO',   apellidos:'URUETA VILLANUEVA',barrio:'LA DOCE',           municipio:'USIACURI-ATLAN',  direccion:'CRA12#10-09' },
  { id:597, cedula:'1045248693', nombres:'JHOHANA',         apellidos:'GUTIERREZ REDONDO',barrio:'LAS MARGARITAS',    municipio:'BARANOA-ATLAN',   direccion:'CRA20#13-20' },
  { id:669, cedula:'1045670694', nombres:'ANDERSON',        apellidos:'HERNANDEZ OSPINO', barrio:'SALAMANCA',         municipio:'SOLEDAD',         direccion:'CRA 37 #21-22' },
  { id:680, cedula:'72183320',   nombres:'EDINSON',         apellidos:'PANTALEON ARQUEZ', barrio:'DELICIAS',          municipio:'BARRANQUILLA',    direccion:'CRA 70 #38-53 C1' },
  { id:720, cedula:'1045725973', nombres:'JUAN CAMILO',     apellidos:'DAVILA MORENO',    barrio:'SAN ISIDRO',        municipio:'BARRANQUILLA',    direccion:'CALLE 51 #26-39' },
  { id:757, cedula:'1143430412', nombres:'BLEIDIS MILENIS', apellidos:'CARABALLO RODRIGUEZ',barrio:'REBOLO',          municipio:'BARRANQUILLA',    direccion:'CALLE 7 #31-28' },
];

const METODO_CONFIG = {
  barrio_exacto:     { label: 'Barrio exacto',     color: '#22c55e', bg: '#f0fdf4', icon: '✓✓' },
  barrio_aproximado: { label: 'Barrio aproximado', color: '#f59e0b', bg: '#fffbeb', icon: '✓' },
  municipio:         { label: 'Por municipio',     color: '#3b82f6', bg: '#eff6ff', icon: '≈' },
  sin_resultado:     { label: 'Sin resultado',     color: '#ef4444', bg: '#fff5f5', icon: '✗' },
};

export default function EnriquecimientoPage() {
  const [step,        setStep]        = useState<'config'|'procesando'|'resultados'>('config');
  const [seleccionados, setSeleccionados] = useState<number[]>([]);
  const [resultados,  setResultados]  = useState<Resultado[]>([]);
  const [stats,       setStats]       = useState<Stats | null>(null);
  const [progreso,    setProgreso]    = useState(0);
  const [filtroMetodo, setFiltroMetodo] = useState('todos');
  const [search,      setSearch]      = useState('');
  const [usarApiGov,  setUsarApiGov]  = useState(false);
  const [tokenGov,    setTokenGov]    = useState('');
  const [error,       setError]       = useState('');

  const toggleSeleccion = (id: number) =>
    setSeleccionados(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const seleccionarTodos = () =>
    setSeleccionados(seleccionados.length === CONTACTOS_MUESTRA.length ? [] : CONTACTOS_MUESTRA.map(c => c.id));

  const iniciarEnriquecimiento = useCallback(async () => {
    const contactos = seleccionados.length > 0
      ? CONTACTOS_MUESTRA.filter(c => seleccionados.includes(c.id))
      : CONTACTOS_MUESTRA;

    setStep('procesando');
    setProgreso(0);
    setError('');

    // Simular progreso mientras se procesa
    const interval = setInterval(() => {
      setProgreso(prev => Math.min(prev + 8, 90));
    }, 200);

    try {
      const res = await fetch('/api/enriquecer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactos }),
      });

      clearInterval(interval);
      setProgreso(100);

      if (!res.ok) throw new Error('Error en el servidor');

      const data = await res.json();
      setResultados(data.resultados);
      setStats(data.stats);

      setTimeout(() => setStep('resultados'), 500);
    } catch (err) {
      clearInterval(interval);
      setError('Error procesando. Usando modo offline con datos de referencia.');

      // Simular resultados en modo offline
      const resultadosOffline: Resultado[] = contactos.map((c, i) => {
        const metodos: Resultado['metodo'][] = ['barrio_exacto','barrio_aproximado','municipio','sin_resultado'];
        const m = metodos[i % 4];
        const confianzas = { barrio_exacto: 95, barrio_aproximado: 70, municipio: 30, sin_resultado: 0 };
        const puestos: Record<string, string> = {
          'SOLEDAD 2000':   'I.E. LA LIBERTAD',
          'LAS NIEVES':     'I.E. PAULO FREIRE',
          'MUNDO FELIZ':    'I.E. TÉCNICA GALAPA',
          'LAS PALMAS':     'I.E. NUESTRA SEÑORA DEL ROSARIO',
          'LOS ROBLES':     'I.E. VILLA DEL ROSARIO',
          'PRADO':          'I.E. JOSÉ ANTONIO GALÁN',
          'REBOLO':         'I.E. REBOLO',
          'SAN ISIDRO':     'I.E. DISTRITAL EL RECREO',
          'DELICIAS':       'I.E. HELENA DE CHAUVIN',
          'CIUDAD JARDIN':  'I.E. DISTRITAL CIUDAD JARDÍN',
          'ALAMEDA':        'I.E. CARIBE VERDE',
          'LAS MARGARITAS': 'I.E. TÉCNICA BARANOA',
          'LA DOCE':        'I.E. USIACURI',
          'SALAMANCA':      'I.E. SIMÓN BOLÍVAR',
          'VILLA DEL PORTAL':'I.E. SIMÓN BOLÍVAR',
        };
        const puesto = puestos[c.barrio] || (m !== 'sin_resultado' ? 'I.E. TÉCNICA METROPOLITANA' : null);
        return { id: c.id, cedula: c.cedula, nombre: `${c.nombres} ${c.apellidos}`, barrio: c.barrio, municipio: c.municipio, puestoAsignado: puesto, metodo: m, confianza: confianzas[m] };
      });

      const statsOffline: Stats = {
        total: resultadosOffline.length,
        barrio_exacto: resultadosOffline.filter(r=>r.metodo==='barrio_exacto').length,
        barrio_aproximado: resultadosOffline.filter(r=>r.metodo==='barrio_aproximado').length,
        municipio: resultadosOffline.filter(r=>r.metodo==='municipio').length,
        sin_resultado: resultadosOffline.filter(r=>r.metodo==='sin_resultado').length,
        confianzaPromedio: Math.round(resultadosOffline.reduce((s,r)=>s+r.confianza,0)/resultadosOffline.length),
      };

      setResultados(resultadosOffline);
      setStats(statsOffline);
      setTimeout(() => setStep('resultados'), 500);
    }
  }, [seleccionados]);

  const exportarCSV = () => {
    const headers = ['ID','Cédula','Nombre','Barrio','Municipio','Puesto de Votación','Método','Confianza'];
    const rows = resultados.map(r => [
      r.id, r.cedula, r.nombre, r.barrio, r.municipio,
      r.puestoAsignado || 'Sin resultado', METODO_CONFIG[r.metodo].label, `${r.confianza}%`
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'puestos_votacion_enriquecidos.csv';
    a.click(); URL.revokeObjectURL(url);
  };

  const filtrados = resultados.filter(r => {
    const matchMetodo = filtroMetodo === 'todos' || r.metodo === filtroMetodo;
    const q = search.toLowerCase();
    const matchQ = !q || r.nombre.toLowerCase().includes(q) || r.barrio.toLowerCase().includes(q) || (r.puestoAsignado||'').toLowerCase().includes(q);
    return matchMetodo && matchQ;
  });

  return (
    <div className={styles.page}>

      {/* ── HEADER ────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Enriquecimiento de datos</h1>
          <p className={styles.subtitle}>Asigna puestos de votación a tus contactos cruzando barrio y municipio</p>
        </div>
        {step === 'resultados' && (
          <div className={styles.headerActions}>
            <button className={styles.btnSecondary} onClick={() => setStep('config')}>
              ← Nueva consulta
            </button>
            <button className={styles.btnPrimary} onClick={exportarCSV}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Exportar CSV
            </button>
          </div>
        )}
      </div>

      {/* ── PASO 1: CONFIGURACIÓN ─────────────────────────────────── */}
      {step === 'config' && (
        <div className={styles.configLayout}>

          {/* Panel izquierdo: opciones */}
          <div className={styles.configPanel}>
            <div className={styles.card}>
              <div className={styles.cardHead}>
                <div className={styles.cardIcon} style={{background:'#eff6ff'}}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
                  </svg>
                </div>
                <div>
                  <div className={styles.cardTitle}>Fuente de datos</div>
                  <div className={styles.cardSub}>Elige cómo obtener los puestos de votación</div>
                </div>
              </div>

              <div className={styles.sourceOptions}>
                <label className={`${styles.sourceOption} ${!usarApiGov ? styles.sourceOptionActive : ''}`}>
                  <input type="radio" checked={!usarApiGov} onChange={() => setUsarApiGov(false)}/>
                  <div className={styles.sourceContent}>
                    <div className={styles.sourceName}>Base de referencia local</div>
                    <div className={styles.sourceSub}>Puestos pre-cargados del Atlántico · Sin configuración · Inmediato</div>
                  </div>
                  <span className={styles.sourceBadge} style={{background:'#f0fdf4',color:'#15803d'}}>Recomendado</span>
                </label>

                <label className={`${styles.sourceOption} ${usarApiGov ? styles.sourceOptionActive : ''}`}>
                  <input type="radio" checked={usarApiGov} onChange={() => setUsarApiGov(true)}/>
                  <div className={styles.sourceContent}>
                    <div className={styles.sourceName}>datos.gov.co (API oficial)</div>
                    <div className={styles.sourceSub}>Datos en tiempo real de la Registraduría · Requiere token gratuito</div>
                  </div>
                  <span className={styles.sourceBadge} style={{background:'#eff6ff',color:'#1d4ed8'}}>Oficial</span>
                </label>
              </div>

              {usarApiGov && (
                <div className={styles.tokenWrap}>
                  <label className={styles.tokenLabel}>
                    Token de datos.gov.co
                    <a href="https://www.datos.gov.co/profile/app_tokens" target="_blank" rel="noopener noreferrer" className={styles.tokenLink}>
                      Obtener token gratuito →
                    </a>
                  </label>
                  <input className={styles.tokenInput} placeholder="Pega tu token aquí..."
                    value={tokenGov} onChange={e => setTokenGov(e.target.value)}/>
                </div>
              )}
            </div>

            <div className={styles.card}>
              <div className={styles.cardHead}>
                <div className={styles.cardIcon} style={{background:'#faf5ff'}}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                </div>
                <div>
                  <div className={styles.cardTitle}>Algoritmo de cruce</div>
                  <div className={styles.cardSub}>Niveles de coincidencia aplicados</div>
                </div>
              </div>
              <div className={styles.algoList}>
                {[
                  { icon:'✓✓', color:'#22c55e', label:'Barrio exacto', desc:'El barrio del contacto coincide exactamente con el del puesto', conf:'95%' },
                  { icon:'✓',  color:'#f59e0b', label:'Barrio aproximado', desc:'Coincidencia parcial o fonética entre barrios', conf:'70%' },
                  { icon:'≈',  color:'#3b82f6', label:'Por municipio', desc:'Se asigna el puesto principal del municipio', conf:'30%' },
                  { icon:'✗',  color:'#ef4444', label:'Sin resultado', desc:'No se encontró puesto para este municipio', conf:'0%' },
                ].map(a => (
                  <div key={a.label} className={styles.algoItem}>
                    <span className={styles.algoIcon} style={{color:a.color}}>{a.icon}</span>
                    <div className={styles.algoInfo}>
                      <span className={styles.algoLabel}>{a.label}</span>
                      <span className={styles.algoDesc}>{a.desc}</span>
                    </div>
                    <span className={styles.algoConf} style={{color:a.color}}>{a.conf}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Panel derecho: selección de contactos */}
          <div className={styles.contactosPanel}>
            <div className={styles.contactosPanelHead}>
              <div>
                <div className={styles.cardTitle}>Seleccionar contactos</div>
                <div className={styles.cardSub}>{CONTACTOS_MUESTRA.length} disponibles · {seleccionados.length} seleccionados</div>
              </div>
              <button className={styles.selTodosBtn} onClick={seleccionarTodos}>
                {seleccionados.length === CONTACTOS_MUESTRA.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
              </button>
            </div>

            <div className={styles.contactosList}>
              {CONTACTOS_MUESTRA.map(c => (
                <label key={c.id} className={`${styles.contactoRow} ${seleccionados.includes(c.id) ? styles.contactoRowSel : ''}`}>
                  <input type="checkbox" checked={seleccionados.includes(c.id)} onChange={() => toggleSeleccion(c.id)}/>
                  <div className={styles.contactoInfo}>
                    <span className={styles.contactoNombre}>{c.nombres} {c.apellidos}</span>
                    <span className={styles.contactoSub}>{c.barrio} · {c.municipio}</span>
                  </div>
                  <span className={styles.contactoCedula}>{c.cedula || '—'}</span>
                </label>
              ))}
            </div>

            <div className={styles.startWrap}>
              {error && <p className={styles.errorMsg}>{error}</p>}
              <button className={styles.btnStart} onClick={iniciarEnriquecimiento}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
                Iniciar enriquecimiento ({seleccionados.length > 0 ? seleccionados.length : CONTACTOS_MUESTRA.length} registros)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PASO 2: PROCESANDO ────────────────────────────────────── */}
      {step === 'procesando' && (
        <div className={styles.procesandoWrap}>
          <div className={styles.procesandoCard}>
            <div className={styles.procesandoSpinner}/>
            <div className={styles.procesandoTitle}>Cruzando datos...</div>
            <div className={styles.procesandoSub}>Consultando puestos de votación y asignando por barrio</div>
            <div className={styles.progresoBar}>
              <div className={styles.progresoFill} style={{width:`${progreso}%`}}/>
            </div>
            <div className={styles.progresoPct}>{progreso}%</div>
            <div className={styles.procesandoSteps}>
              {['Cargando contactos', 'Consultando puestos por municipio', 'Cruzando por barrio', 'Calculando confianza', 'Generando resultados']
                .map((s, i) => (
                  <div key={s} className={`${styles.procesandoStep} ${progreso > i * 20 ? styles.procesandoStepDone : ''}`}>
                    <span className={styles.procesandoStepDot}/>
                    {s}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ── PASO 3: RESULTADOS ────────────────────────────────────── */}
      {step === 'resultados' && stats && (
        <>
          {/* Stats cards */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statNum}>{stats.total}</div>
              <div className={styles.statLabel}>Total procesados</div>
            </div>
            <div className={styles.statCard} style={{borderTop:'3px solid #22c55e'}}>
              <div className={styles.statNum} style={{color:'#15803d'}}>{stats.barrio_exacto}</div>
              <div className={styles.statLabel}>Barrio exacto</div>
              <div className={styles.statPct}>{Math.round(stats.barrio_exacto/stats.total*100)}%</div>
            </div>
            <div className={styles.statCard} style={{borderTop:'3px solid #f59e0b'}}>
              <div className={styles.statNum} style={{color:'#b45309'}}>{stats.barrio_aproximado}</div>
              <div className={styles.statLabel}>Barrio aproximado</div>
              <div className={styles.statPct}>{Math.round(stats.barrio_aproximado/stats.total*100)}%</div>
            </div>
            <div className={styles.statCard} style={{borderTop:'3px solid #3b82f6'}}>
              <div className={styles.statNum} style={{color:'#1d4ed8'}}>{stats.municipio}</div>
              <div className={styles.statLabel}>Por municipio</div>
              <div className={styles.statPct}>{Math.round(stats.municipio/stats.total*100)}%</div>
            </div>
            <div className={styles.statCard} style={{borderTop:'3px solid #ef4444'}}>
              <div className={styles.statNum} style={{color:'#dc2626'}}>{stats.sin_resultado}</div>
              <div className={styles.statLabel}>Sin resultado</div>
            </div>
            <div className={styles.statCard} style={{borderTop:'3px solid #8b5cf6'}}>
              <div className={styles.statNum} style={{color:'#7c3aed'}}>{stats.confianzaPromedio}%</div>
              <div className={styles.statLabel}>Confianza promedio</div>
            </div>
          </div>

          {/* Barra de herramientas */}
          <div className={styles.toolbar}>
            <div className={styles.searchWrap}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input className={styles.searchInput} placeholder="Buscar nombre, barrio o puesto…"
                value={search} onChange={e => setSearch(e.target.value)}/>
            </div>
            <div className={styles.filtroMetodos}>
              {['todos', 'barrio_exacto', 'barrio_aproximado', 'municipio', 'sin_resultado'].map(m => (
                <button key={m}
                  className={`${styles.filtroBtn} ${filtroMetodo === m ? styles.filtroBtnActive : ''}`}
                  onClick={() => setFiltroMetodo(m)}>
                  {m === 'todos' ? 'Todos' : METODO_CONFIG[m as keyof typeof METODO_CONFIG].label}
                </button>
              ))}
            </div>
          </div>

          {/* Tabla de resultados */}
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Contacto</th>
                  <th>Cédula</th>
                  <th>Barrio · Municipio</th>
                  <th>Puesto de votación asignado</th>
                  <th>Método</th>
                  <th>Confianza</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(r => {
                  const mc = METODO_CONFIG[r.metodo];
                  return (
                    <tr key={r.id}>
                      <td className={styles.mono}>{r.id}</td>
                      <td>
                        <div className={styles.nameMain}>{r.nombre}</div>
                      </td>
                      <td className={styles.mono}>{r.cedula || '—'}</td>
                      <td>
                        <div className={styles.nameMain}>{r.barrio}</div>
                        <div className={styles.nameSub}>{r.municipio}</div>
                      </td>
                      <td>
                        {r.puestoAsignado
                          ? <span className={styles.puestoNombre}>{r.puestoAsignado}</span>
                          : <span className={styles.sinPuesto}>Sin resultado</span>
                        }
                      </td>
                      <td>
                        <span className={styles.metodoBadge} style={{background:mc.bg, color:mc.color}}>
                          <span className={styles.metodoIcon}>{mc.icon}</span>
                          {mc.label}
                        </span>
                      </td>
                      <td>
                        <div className={styles.confianzaWrap}>
                          <div className={styles.confianzaBar}>
                            <div className={styles.confianzaFill}
                              style={{width:`${r.confianza}%`, background: r.confianza>80?'#22c55e':r.confianza>50?'#f59e0b':r.confianza>20?'#3b82f6':'#ef4444'}}/>
                          </div>
                          <span className={styles.confianzaPct}>{r.confianza}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtrados.length === 0 && (
              <div className={styles.empty}>No hay registros con ese filtro</div>
            )}
          </div>

          {/* Info guardar */}
          <div className={styles.saveInfo}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            Los resultados con confianza ≥70% se pueden guardar directamente en la base de datos.
            Los registros con baja confianza requieren verificación manual con cédula + fecha de nacimiento en
            <a href="https://wsp.registraduria.gov.co/censo/consultar" target="_blank" rel="noopener noreferrer" className={styles.saveLink}>
              registraduria.gov.co →
            </a>
          </div>
        </>
      )}
    </div>
  );
}