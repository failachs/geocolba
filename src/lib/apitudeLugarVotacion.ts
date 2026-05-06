// src/lib/apitudeLugarVotacion.ts
// Servicio para consultar puesto de votación via Apitude
// La API Key NUNCA sale del servidor — solo se usa aquí

const BASE_URL  = 'https://apitude.co/api/v1.0/requests/lugar-votacion-co';
const MAX_REINTENTOS = 5;
const ESPERA_MS      = 1500; // ms entre reintentos

export interface PuestoVotacionData {
  nuip:         string;
  departamento: string;
  municipio:    string;
  puesto:       string;
  direccion:    string;
  mesa:         string;
  novedad:      string;
  fechaNovedad: string;
  resolucion:   string;
}

export interface PuestoVotacionResult {
  ok:     true;
  data:   PuestoVotacionData;
}

export interface PuestoVotacionError {
  ok:      false;
  mensaje: string;
  codigo?: number;
}

export type PuestoVotacionResponse = PuestoVotacionResult | PuestoVotacionError;

// ─── Paso 1: Crear solicitud en Apitude ─────────────────────────────────────
async function crearSolicitud(cedula: string, apiKey: string): Promise<string> {
  const res = await fetch(BASE_URL + '/', {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key':    apiKey,
    },
    body: JSON.stringify({ document_number: cedula }),
  });

  if (!res.ok) {
    const texto = await res.text();
    throw new Error(`Apitude POST ${res.status}: ${texto.slice(0, 200)}`);
  }

  const json = await res.json();

  // Apitude devuelve { request_id: "..." } o { id: "..." }
  const requestId = json?.request_id || json?.id || json?.data?.request_id;
  if (!requestId) {
    throw new Error('Apitude no devolvió request_id. Respuesta: ' + JSON.stringify(json).slice(0, 300));
  }

  return String(requestId);
}

// ─── Paso 2: Consultar resultado con reintentos ──────────────────────────────
async function consultarResultado(requestId: string, apiKey: string): Promise<any> {
  for (let intento = 1; intento <= MAX_REINTENTOS; intento++) {
    const res = await fetch(`${BASE_URL}/${requestId}/`, {
      method:  'GET',
      headers: { 'x-api-key': apiKey },
    });

    if (!res.ok) {
      throw new Error(`Apitude GET ${res.status} (intento ${intento})`);
    }

    const json = await res.json();

    // Si el mensaje indica que está completo
    const mensaje = (json?.message || '').toLowerCase();
    if (mensaje.includes('completed') || mensaje.includes('completado')) {
      return json;
    }

    // Si aún está procesando, esperar y reintentar
    if (intento < MAX_REINTENTOS) {
      await new Promise(r => setTimeout(r, ESPERA_MS));
    }
  }

  throw new Error(`Apitude no completó la solicitud después de ${MAX_REINTENTOS} intentos.`);
}

// ─── Normalizar respuesta ─────────────────────────────────────────────────────
function normalizar(json: any): PuestoVotacionData {
  const d = json?.result?.data || json?.data || {};
  return {
    nuip:         String(d.nuip          || ''),
    departamento: String(d.departamento  || ''),
    municipio:    String(d.municipio     || ''),
    puesto:       String(d.puesto        || ''),
    direccion:    String(d.direccion     || ''),
    mesa:         String(d.mesa          || ''),
    novedad:      String(d.novedad       || ''),
    fechaNovedad: String(d.fecha_novedad || ''),
    resolucion:   String(d.resolucion    || ''),
  };
}

// ─── Función principal exportada ─────────────────────────────────────────────
export async function consultarPuestoVotacion(
  cedula: string
): Promise<PuestoVotacionResponse> {
  const apiKey = process.env.APITUDE_API_KEY;

  if (!apiKey) {
    return { ok: false, mensaje: 'Falta configurar APITUDE_API_KEY.', codigo: 500 };
  }

  try {
    // 1. Crear solicitud → obtener request_id
    const requestId = await crearSolicitud(cedula, apiKey);

    // 2. Esperar y consultar resultado
    const resultado = await consultarResultado(requestId, apiKey);

    // 3. Verificar que hay datos
    const data = normalizar(resultado);
    if (!data.nuip && !data.puesto && !data.municipio) {
      return { ok: false, mensaje: 'No se encontró información para esta cédula.', codigo: 404 };
    }

    return { ok: true, data };

  } catch (err: any) {
    // Loguear sin exponer la cédula completa
    console.error('[Apitude] Error:', err?.message || 'Error desconocido');
    return {
      ok:      false,
      mensaje: 'Error consultando el servicio. Intenta nuevamente.',
      codigo:  502,
    };
  }
}