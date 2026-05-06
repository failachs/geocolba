import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';

export const runtime = 'nodejs';

function limpiarCedula(value: unknown) {
  return String(value || '').replace(/\D/g, '').trim();
}

export async function POST(req: NextRequest) {
  const client = new Client({
    connectionString: process.env.VOLUNTARIOS_DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    const body = await req.json();
    const cedula = limpiarCedula(body.cedula);

    if (!cedula) {
      return NextResponse.json(
        { ok: false, error: 'Debe enviar la cédula.' },
        { status: 400 }
      );
    }

    if (!process.env.VOLUNTARIOS_DATABASE_URL) {
      return NextResponse.json(
        { ok: false, error: 'Falta configurar VOLUNTARIOS_DATABASE_URL.' },
        { status: 500 }
      );
    }

    await client.connect();

    const result = await client.query(
      `
      SELECT 
        uid,
        id,
        cedula,
        nombre_completo,
        asignado,
        direccion,
        barrio,
        municipio,
        departamento,
        telefono_1,
        telefono_2,
        correo,
        estado
      FROM public.voluntarios
      WHERE cedula = $1
      LIMIT 1;
      `,
      [cedula]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({
        ok: true,
        encontrado: false,
        data: null,
        mensaje: 'No se encontró un voluntario con esa cédula.',
      });
    }

    return NextResponse.json({
      ok: true,
      encontrado: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('[api/voluntarios/consultar]', error);

    return NextResponse.json(
      {
        ok: false,
        error: 'Error consultando la base de voluntarios.',
      },
      { status: 500 }
    );
  } finally {
    await client.end().catch(() => null);
  }
}