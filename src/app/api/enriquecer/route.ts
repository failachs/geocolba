// app/api/enriquecer/route.ts
// Cruza contactos con puestos de votación por barrio/municipio

import { NextRequest, NextResponse } from 'next/server';

interface Contacto {
  id:        number;
  cedula:    string;
  nombres:   string;
  apellidos: string;
  barrio:    string;
  municipio: string;
  direccion: string;
}

interface ResultadoEnriquecimiento {
  id:            number;
  cedula:        string;
  nombre:        string;
  barrio:        string;
  municipio:     string;
  puestoAsignado: string | null;
  metodo:        'barrio_exacto' | 'barrio_aproximado' | 'municipio' | 'sin_resultado';
  confianza:     number; // 0-100
}

export async function POST(req: NextRequest) {
  try {
    const { contactos } = await req.json() as { contactos: Contacto[] };

    if (!contactos?.length) {
      return NextResponse.json({ error: 'No se enviaron contactos' }, { status: 400 });
    }

    // Obtener municipios únicos
    const municipiosUnicos = [...new Set(contactos.map(c =>
      normalizarMunicipio(c.municipio)
    ))];

    // Cargar puestos para cada municipio
    const puestosPorMunicipio: Record<string, any[]> = {};
    for (const mun of municipiosUnicos) {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/puestos-votacion?municipio=${encodeURIComponent(mun)}`,
          { next: { revalidate: 3600 } }
        );
        const data = await res.json();
        puestosPorMunicipio[mun] = data.puestos || [];
      } catch {
        puestosPorMunicipio[mun] = [];
      }
    }

    // Cruzar cada contacto con su puesto
    const resultados: ResultadoEnriquecimiento[] = contactos.map(contacto => {
      const mun    = normalizarMunicipio(contacto.municipio);
      const puestos = puestosPorMunicipio[mun] || [];
      const barrio  = normalizar(contacto.barrio);

      // 1. Coincidencia exacta de barrio
      const exacto = puestos.find(p => normalizar(p.barrio) === barrio);
      if (exacto) {
        return {
          id: contacto.id, cedula: contacto.cedula,
          nombre: `${contacto.nombres} ${contacto.apellidos}`,
          barrio: contacto.barrio, municipio: contacto.municipio,
          puestoAsignado: exacto.nombre, metodo: 'barrio_exacto', confianza: 95,
        };
      }

      // 2. Coincidencia parcial de barrio (el barrio contiene palabras del puesto o viceversa)
      const parcial = puestos.find(p => {
        const pb = normalizar(p.barrio);
        return barrio.includes(pb) || pb.includes(barrio) ||
               calcularSimilitud(barrio, pb) > 0.6;
      });
      if (parcial) {
        return {
          id: contacto.id, cedula: contacto.cedula,
          nombre: `${contacto.nombres} ${contacto.apellidos}`,
          barrio: contacto.barrio, municipio: contacto.municipio,
          puestoAsignado: parcial.nombre, metodo: 'barrio_aproximado', confianza: 70,
        };
      }

      // 3. Coincidencia por dirección (si el contacto vive cerca del puesto)
      const porDir = puestos.find(p => {
        const dir = normalizar(contacto.direccion);
        const pDir = normalizar(p.direccion);
        const carrera = extraerCarrera(dir);
        const pCarrera = extraerCarrera(pDir);
        return carrera && pCarrera && carrera === pCarrera;
      });
      if (porDir) {
        return {
          id: contacto.id, cedula: contacto.cedula,
          nombre: `${contacto.nombres} ${contacto.apellidos}`,
          barrio: contacto.barrio, municipio: contacto.municipio,
          puestoAsignado: porDir.nombre, metodo: 'barrio_aproximado', confianza: 55,
        };
      }

      // 4. Asignar el primer puesto del municipio como fallback
      if (puestos.length > 0) {
        return {
          id: contacto.id, cedula: contacto.cedula,
          nombre: `${contacto.nombres} ${contacto.apellidos}`,
          barrio: contacto.barrio, municipio: contacto.municipio,
          puestoAsignado: puestos[0].nombre, metodo: 'municipio', confianza: 30,
        };
      }

      return {
        id: contacto.id, cedula: contacto.cedula,
        nombre: `${contacto.nombres} ${contacto.apellidos}`,
        barrio: contacto.barrio, municipio: contacto.municipio,
        puestoAsignado: null, metodo: 'sin_resultado', confianza: 0,
      };
    });

    const stats = {
      total:            resultados.length,
      barrio_exacto:    resultados.filter(r => r.metodo === 'barrio_exacto').length,
      barrio_aproximado:resultados.filter(r => r.metodo === 'barrio_aproximado').length,
      municipio:        resultados.filter(r => r.metodo === 'municipio').length,
      sin_resultado:    resultados.filter(r => r.metodo === 'sin_resultado').length,
      confianzaPromedio:Math.round(resultados.reduce((s, r) => s + r.confianza, 0) / resultados.length),
    };

    return NextResponse.json({ resultados, stats });

  } catch (err) {
    return NextResponse.json({ error: 'Error procesando solicitud' }, { status: 500 });
  }
}

function normalizar(str: string = ''): string {
  return str.toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9\s]/g, '')
    .trim();
}

function normalizarMunicipio(mun: string = ''): string {
  const m = normalizar(mun);
  if (m.includes('BARRANQUILLA') || m.includes('BQUILLA')) return 'BARRANQUILLA';
  if (m.includes('SOLEDAD'))      return 'SOLEDAD';
  if (m.includes('GALAPA'))       return 'GALAPA';
  if (m.includes('MALAMBO'))      return 'MALAMBO';
  if (m.includes('POLONUEVO'))    return 'POLONUEVO';
  if (m.includes('SABANAGRANDE')) return 'SABANAGRANDE';
  if (m.includes('USIACURI'))     return 'USIACURI';
  if (m.includes('BARANOA'))      return 'BARANOA';
  if (m.includes('PUERTO'))       return 'PUERTOCOOLOMBIA';
  return m;
}

function extraerCarrera(dir: string): string | null {
  const match = dir.match(/(?:CRA|CARRERA|CR)\s*(\d+)/);
  return match ? match[1] : null;
}

function calcularSimilitud(a: string, b: string): number {
  if (!a || !b) return 0;
  const wordsA = new Set(a.split(/\s+/));
  const wordsB = new Set(b.split(/\s+/));
  const intersection = [...wordsA].filter(w => wordsB.has(w)).length;
  return intersection / Math.max(wordsA.size, wordsB.size);
}