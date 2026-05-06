// src/lib/registraduria.ts

export interface RegistraduriaData {
  nuip: string; nombre: string; departamento: string; municipio: string;
  puesto: string; direccion: string; mesa: string; zona: string; novedad: string;
}
export type RegistraduriaResult =
  | { ok: true;  data: RegistraduriaData }
  | { ok: false; mensaje: string; codigo: number };

const BASE = 'https://wsp.registraduria.gov.co';
const UA   = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function fmtFecha(f: string): string {
  const [y, m, d] = f.split('-');
  return `${d}/${m}/${y}`;
}

function parsear(html: string): RegistraduriaData | null {
  if (!html || html.length < 200) return null;
  if (/403|forbidden|access denied/i.test(html.slice(0, 500))) return null;
  if (/no se encontr|no existe|incorrecto|no hay|sin result|not found/i.test(html)) return null;

  const mapa: Record<string, string> = {};
  const trRx = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let tr: RegExpExecArray | null;
  while ((tr = trRx.exec(html)) !== null) {
    const tdRx = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
    const celdas: string[] = [];
    let td: RegExpExecArray | null;
    while ((td = tdRx.exec(tr[1])) !== null) {
      const t = td[1].replace(/<[^>]+>/g,'').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
      if (t) celdas.push(t);
    }
    if (celdas.length >= 2) mapa[celdas[0].toUpperCase().trim()] = celdas[1];
  }

  const get = (...keys: string[]) => keys.map(k => mapa[k.toUpperCase()]).find(Boolean) || '';
  const nuip   = get('NUIP','CÉDULA','CEDULA','DOCUMENTO','C.C.');
  const puesto = get('PUESTO DE VOTACIÓN','PUESTO DE VOTACION','PUESTO','LUGAR DE VOTACIÓN','LUGAR DE VOTACION');
  if (!nuip && !puesto) return null;

  return {
    nuip, nombre: get('NOMBRE','NOMBRES','NOMBRE COMPLETO','APELLIDOS Y NOMBRES'),
    departamento: get('DEPARTAMENTO','DPTO'),
    municipio:    get('MUNICIPIO','CIUDAD'),
    puesto,       direccion: get('DIRECCIÓN','DIRECCION','DIRECCIÓN DEL PUESTO'),
    mesa:         get('MESA','NÚMERO DE MESA','NRO MESA','NRO. MESA'),
    zona:         get('ZONA','ZONA DE VOTACIÓN','ZONA DE VOTACION'),
    novedad:      get('NOVEDAD'),
  };
}

export async function consultarRegistraduria(
  cedula: string,
  fechaNacimiento: string
): Promise<RegistraduriaResult> {
  try {
    // ── Paso 1: GET para obtener cookies + HTML del formulario ────
    const getRes = await fetch(`${BASE}/censo/consultar`, {
      headers: {
        'User-Agent': UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-CO,es;q=0.9',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
      },
    });

    const cookies  = getRes.headers.get('set-cookie')
      ?.split(',').map(c => c.split(';')[0].trim()).filter(Boolean).join('; ') || '';
    const formHtml = await getRes.text();

    // ── Extraer TODOS los inputs del formulario ───────────────────
    const inputRx  = /<input([^>]+)>/gi;
    const formInputs: Record<string, string> = {};
    let inp: RegExpExecArray | null;
    while ((inp = inputRx.exec(formHtml)) !== null) {
      const attrs = inp[1];
      const name  = attrs.match(/name=["']([^"']+)["']/i)?.[1];
      const value = attrs.match(/value=["']([^"']+)["']/i)?.[1] || '';
      if (name) formInputs[name] = value;
    }

    // Extraer action del formulario
    const formAction = formHtml.match(/<form[^>]+action=["']([^"']+)["']/i)?.[1] || '/censo/consultar';
    const fullAction = formAction.startsWith('http') ? formAction : `${BASE}${formAction}`;

    if (process.env.NODE_ENV === 'development') {
      console.log('[Reg] GET status:', getRes.status);
      console.log('[Reg] cookies:', cookies.slice(0, 60));
      console.log('[Reg] formAction:', formAction);
      console.log('[Reg] formInputs:', JSON.stringify(formInputs));
    }

    // ── Paso 2: POST con todos los campos del formulario ──────────
    // Empezar con todos los campos hidden del form original
    const body = new URLSearchParams();

    // Añadir todos los campos hidden del formulario
    for (const [k, v] of Object.entries(formInputs)) {
      if (!['nuip','cedula','documento','fecha_exp','fecha_nac','fecha_nacimiento','fecha'].includes(k.toLowerCase())) {
        body.append(k, v);
      }
    }

    // Añadir la cédula con todos los nombres posibles que tenga el form
    const cedulaField = Object.keys(formInputs).find(k =>
      ['nuip','cedula','documento','cc'].includes(k.toLowerCase())
    ) || 'nuip';
    body.set(cedulaField, cedula);

    // Añadir la fecha con todos los nombres posibles
    const fechaField = Object.keys(formInputs).find(k =>
      k.toLowerCase().includes('fecha')
    ) || 'fecha_exp';
    body.set(fechaField, fmtFecha(fechaNacimiento));

    if (process.env.NODE_ENV === 'development') {
      console.log('[Reg] POST body:', body.toString());
      console.log('[Reg] POST action:', fullAction);
    }

    const postRes = await fetch(fullAction, {
      method: 'POST',
      headers: {
        'User-Agent':    UA,
        'Content-Type':  'application/x-www-form-urlencoded',
        'Accept':        'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-CO,es;q=0.9',
        'Referer':       `${BASE}/censo/consultar`,
        'Origin':        BASE,
        'Cookie':        cookies,
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
      },
      body: body.toString(),
      redirect: 'follow',
    });

    const resultHtml = await postRes.text();

    if (process.env.NODE_ENV === 'development') {
      console.log('[Reg] POST status:', postRes.status, '| len:', resultHtml.length);
      // Mostrar sección relevante del HTML (después del body/main)
      const bodyStart = resultHtml.indexOf('<body');
      const relevant  = resultHtml.slice(bodyStart > 0 ? bodyStart : 0, bodyStart + 3000);
      console.log('[Reg] POST relevant HTML:', relevant.replace(/\s+/g,' ').slice(0, 800));
    }

    const data = parsear(resultHtml);
    if (data) return { ok: true, data };

    if (/500|error interno/i.test(resultHtml.slice(0, 1000))) {
      return { ok: false, mensaje: 'Error en el servidor de la Registraduría. Intenta en unos minutos.', codigo: 500 };
    }

    return { ok: false, mensaje: 'No se encontró información para esta cédula y fecha de nacimiento.', codigo: 404 };

  } catch (err: any) {
    console.error('[Registraduria] Error:', err?.message);
    return { ok: false, mensaje: 'Error consultando la Registraduría. Intenta nuevamente.', codigo: 502 };
  }
}