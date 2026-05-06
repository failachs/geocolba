// src/app/api/puesto-votacion/route.ts
// Ruta API — intenta Apitude (si hay key) o Registraduría (gratuita)

import { NextRequest, NextResponse } from 'next/server';

function validarCedula(cedula: string): string | null {
  if (!cedula?.trim())            return 'Debe enviar la cédula.';
  if (!/^\d+$/.test(cedula))      return 'La cédula solo debe contener números.';
  if (cedula.length < 5 || cedula.length > 12) return 'La cédula debe tener entre 5 y 12 dígitos.';
  return null;
}

function validarFecha(fecha: string): string | null {
  if (!fecha?.trim()) return null; // opcional si hay Apitude
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return 'La fecha debe tener formato YYYY-MM-DD.';
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return 'Fecha inválida.';
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const cedula = (body?.cedula || '').toString().trim().replace(/[.\s-]/g, '');
    const fecha  = (body?.fechaNacimiento || body?.fecha || '').toString().trim();

    const errCedula = validarCedula(cedula);
    if (errCedula) return NextResponse.json({ ok: false, mensaje: errCedula }, { status: 400 });

    // ── Opción A: Apitude (pago, solo cédula) ───────────────────
    if (process.env.APITUDE_API_KEY) {
      const { consultarPuestoVotacion } = await import('@/lib/apitudeLugarVotacion');
      const resultado = await consultarPuestoVotacion(cedula);
      if (resultado.ok) return NextResponse.json({ ok: true, data: resultado.data, fuente: 'apitude' });
      // Si falla Apitude, intentar con Registraduría si hay fecha
    }

    // ── Opción B: Registraduría (gratuita, requiere fecha) ───────
    const errFecha = validarFecha(fecha);
    if (errFecha) return NextResponse.json({ ok: false, mensaje: errFecha }, { status: 400 });

    if (!fecha) {
      return NextResponse.json({
        ok: false,
        mensaje: 'Se requiere la fecha de nacimiento para consultar la Registraduría.',
        requiereFecha: true,
      }, { status: 400 });
    }

    const { consultarRegistraduria } = await import('@/lib/registraduria');
    const resultado = await consultarRegistraduria(cedula, fecha);

    if (!resultado.ok) {
      return NextResponse.json({ ok: false, mensaje: resultado.mensaje }, { status: resultado.codigo });
    }

    return NextResponse.json({ ok: true, data: resultado.data, fuente: 'registraduria' });

  } catch (err: any) {
    console.error('[puesto-votacion]', err?.message);
    return NextResponse.json({ ok: false, mensaje: 'Error interno del servidor.' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: false, mensaje: 'Use POST.' }, { status: 405 });
}