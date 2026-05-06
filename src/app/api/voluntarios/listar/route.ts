import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';

export const runtime = 'nodejs';

function getClient() {
  const connectionString = process.env.VOLUNTARIOS_DATABASE_URL;

  if (!connectionString) {
    throw new Error('Falta configurar VOLUNTARIOS_DATABASE_URL.');
  }

  return new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
  });
}

function limpiarTexto(value: string | null) {
  return String(value || '').trim();
}

export async function GET(req: NextRequest) {
  let client: Client | null = null;

  try {
    const { searchParams } = new URL(req.url);

    const page = Math.max(Number(searchParams.get('page') || 1), 1);
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || 15), 1), 5000);
    const offset = (page - 1) * limit;

    const search = limpiarTexto(searchParams.get('search'));
    const municipio = limpiarTexto(searchParams.get('municipio'));
    const departamento = limpiarTexto(searchParams.get('departamento'));
    const asignado = limpiarTexto(searchParams.get('asignado'));
    const voto = limpiarTexto(searchParams.get('voto'));

    client = getClient();
    await client.connect();

    const where: string[] = [];
    const params: unknown[] = [];

    if (search) {
      params.push(`%${search}%`);
      where.push(`
        (
          cedula ILIKE $${params.length}
          OR nombre_completo ILIKE $${params.length}
          OR nombres_completos ILIKE $${params.length}
          OR apellidos_completos ILIKE $${params.length}
          OR barrio ILIKE $${params.length}
          OR municipio ILIKE $${params.length}
          OR departamento ILIKE $${params.length}
          OR telefono_1 ILIKE $${params.length}
          OR telefono_2 ILIKE $${params.length}
          OR correo ILIKE $${params.length}
        )
      `);
    }

    if (municipio && municipio !== 'todos' && municipio !== 'Todos los municipios') {
      params.push(municipio);
      where.push(`municipio = $${params.length}`);
    }

    if (departamento && departamento !== 'todos' && departamento !== 'Todos los departamentos') {
      params.push(departamento);
      where.push(`departamento = $${params.length}`);
    }

    if (asignado && asignado !== 'todos' && asignado !== 'Todos los roles') {
      if (asignado === 'lider') {
        where.push(`LOWER(COALESCE(asignado, '')) LIKE '%lider%'`);
      }

      if (asignado === 'voluntario') {
        where.push(`LOWER(COALESCE(asignado, '')) NOT LIKE '%lider%'`);
      }
    }

    if (voto && voto !== 'todos') {
      if (voto === 'VOTÓ') {
        where.push(`
          (
            LOWER(COALESCE(estado, '')) LIKE '%vot%'
            OR LOWER(COALESCE(estado, '')) LIKE '%confirmado%'
            OR LOWER(COALESCE(estado, '')) LIKE '%si%'
          )
          AND LOWER(COALESCE(estado, '')) NOT LIKE '%no%'
        `);
      }

      if (voto === 'NO VOTÓ') {
        where.push(`
          (
            LOWER(COALESCE(estado, '')) LIKE '%no%'
            OR LOWER(COALESCE(estado, '')) LIKE '%pendiente%'
            OR COALESCE(estado, '') = ''
          )
        `);
      }
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const totalQuery = await client.query(
      `
      SELECT COUNT(*)::int AS total
      FROM public.voluntarios
      ${whereSql};
      `,
      params
    );

    const total = Number(totalQuery.rows[0]?.total || 0);
    const totalPages = Math.max(Math.ceil(total / limit), 1);

    const dataParams = [...params, limit, offset];
    const limitIndex = dataParams.length - 1;
    const offsetIndex = dataParams.length;

    const dataQuery = await client.query(
      `
      SELECT
        id AS uid,
        id,
        cedula,
        asignado,
        nombres_completos,
        apellidos_completos,
        nombre_completo,
        direccion,
        barrio,
        municipio,
        departamento,
        telefono_1,
        telefono_2,
        correo,
        estado,
        fecha_cargue
      FROM public.voluntarios
      ${whereSql}
      ORDER BY uid ASC
      LIMIT $${limitIndex}
      OFFSET $${offsetIndex};
      `,
      dataParams
    );

    const statsQuery = await client.query(`
      SELECT
        COUNT(*)::int AS total,

        COUNT(*) FILTER (
          WHERE LOWER(COALESCE(asignado, '')) LIKE '%lider%'
        )::int AS lideres,

        COUNT(*) FILTER (
          WHERE LOWER(COALESCE(asignado, '')) NOT LIKE '%lider%'
        )::int AS voluntarios,

        COUNT(*) FILTER (
          WHERE (
            LOWER(COALESCE(estado, '')) LIKE '%vot%'
            OR LOWER(COALESCE(estado, '')) LIKE '%confirmado%'
            OR LOWER(COALESCE(estado, '')) LIKE '%si%'
          )
          AND LOWER(COALESCE(estado, '')) NOT LIKE '%no%'
        )::int AS votaron,

        COUNT(*) FILTER (
          WHERE (
            LOWER(COALESCE(estado, '')) LIKE '%no%'
            OR LOWER(COALESCE(estado, '')) LIKE '%pendiente%'
            OR COALESCE(estado, '') = ''
          )
        )::int AS no_votaron,

        COUNT(DISTINCT municipio)::int AS municipios
      FROM public.voluntarios;
    `);

    const municipiosQuery = await client.query(`
      SELECT municipio, COUNT(*)::int AS cantidad
      FROM public.voluntarios
      WHERE municipio IS NOT NULL 
        AND TRIM(municipio) <> ''
      GROUP BY municipio
      ORDER BY municipio ASC;
    `);

    const departamentosQuery = await client.query(`
      SELECT departamento, COUNT(*)::int AS cantidad
      FROM public.voluntarios
      WHERE departamento IS NOT NULL 
        AND TRIM(departamento) <> ''
      GROUP BY departamento
      ORDER BY departamento ASC;
    `);

    return NextResponse.json({
      ok: true,
      data: dataQuery.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      stats: statsQuery.rows[0],
      filtros: {
        municipios: municipiosQuery.rows,
        departamentos: departamentosQuery.rows,
      },
    });
  } catch (error) {
    console.error('[api/voluntarios/listar]', error);

    const message =
      error instanceof Error ? error.message : 'Error consultando voluntarios.';

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 }
    );
  } finally {
    if (client) {
      await client.end().catch(() => null);
    }
  }
}