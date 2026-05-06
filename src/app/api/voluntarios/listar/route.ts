import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const connectionString =
  process.env.VOLUNTARIOS_DATABASE_URL || process.env.DATABASE_URL;

const pool = new Pool({
  connectionString,
  ssl: connectionString?.includes('railway')
    ? { rejectUnauthorized: false }
    : undefined,
});

function limpiarTexto(value: unknown): string {
  return String(value ?? '').trim();
}

function normalizarFiltro(value: unknown): string {
  return limpiarTexto(value).toLowerCase();
}

export async function GET(request: NextRequest) {
  if (!connectionString) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Falta configurar VOLUNTARIOS_DATABASE_URL o DATABASE_URL.',
      },
      { status: 500 }
    );
  }

  const client = await pool.connect();

  try {
    const { searchParams } = new URL(request.url);

    const page = Math.max(Number(searchParams.get('page') || 1), 1);
    const limit = Math.min(
      Math.max(Number(searchParams.get('limit') || 50), 1),
      5000
    );
    const offset = (page - 1) * limit;

    const search = normalizarFiltro(searchParams.get('search'));
    const municipio = normalizarFiltro(searchParams.get('municipio'));
    const departamento = normalizarFiltro(searchParams.get('departamento'));
    const asignado = normalizarFiltro(searchParams.get('asignado'));
    const estado = normalizarFiltro(searchParams.get('estado'));
    const voto = limpiarTexto(searchParams.get('voto')).toUpperCase();

    const where: string[] = [];
    const values: unknown[] = [];

    const addValue = (value: unknown) => {
      values.push(value);
      return `$${values.length}`;
    };

    if (search) {
      const p = addValue(`%${search}%`);

      where.push(`
        (
          LOWER(COALESCE(cedula, '')) LIKE ${p}
          OR LOWER(COALESCE(nombres_completos, '')) LIKE ${p}
          OR LOWER(COALESCE(apellidos_completos, '')) LIKE ${p}
          OR LOWER(COALESCE(nombre_completo, '')) LIKE ${p}
          OR LOWER(COALESCE(direccion, '')) LIKE ${p}
          OR LOWER(COALESCE(barrio, '')) LIKE ${p}
          OR LOWER(COALESCE(municipio, '')) LIKE ${p}
          OR LOWER(COALESCE(departamento, '')) LIKE ${p}
          OR LOWER(COALESCE(telefono_1, '')) LIKE ${p}
          OR LOWER(COALESCE(telefono_2, '')) LIKE ${p}
          OR LOWER(COALESCE(correo, '')) LIKE ${p}
          OR LOWER(COALESCE(asignado, '')) LIKE ${p}
          OR LOWER(COALESCE(estado, '')) LIKE ${p}
        )
      `);
    }

    if (municipio && municipio !== 'todos') {
      const p = addValue(`%${municipio}%`);
      where.push(`LOWER(COALESCE(municipio, '')) LIKE ${p}`);
    }

    if (departamento && departamento !== 'todos') {
      const p = addValue(`%${departamento}%`);
      where.push(`LOWER(COALESCE(departamento, '')) LIKE ${p}`);
    }

    if (asignado && asignado !== 'todos') {
      const p = addValue(`%${asignado}%`);
      where.push(`LOWER(COALESCE(asignado, '')) LIKE ${p}`);
    }

    if (estado && estado !== 'todos') {
      const p = addValue(`%${estado}%`);
      where.push(`LOWER(COALESCE(estado, '')) LIKE ${p}`);
    }

    if (voto === 'VOTÓ' || voto === 'VOTO' || voto === 'SI' || voto === 'SÍ') {
      where.push(`
        (
          UPPER(COALESCE(estado, '')) LIKE '%VOTÓ%'
          OR UPPER(COALESCE(estado, '')) LIKE '%VOTO%'
          OR UPPER(COALESCE(estado, '')) LIKE '%SI%'
          OR UPPER(COALESCE(estado, '')) LIKE '%SÍ%'
        )
      `);
    }

    if (voto === 'NO VOTÓ' || voto === 'NO VOTO') {
      where.push(`
        (
          UPPER(COALESCE(estado, '')) LIKE '%NO VOTÓ%'
          OR UPPER(COALESCE(estado, '')) LIKE '%NO VOTO%'
          OR UPPER(COALESCE(estado, '')) LIKE '%PENDIENTE%'
          OR COALESCE(estado, '') = ''
        )
      `);
    }

    const whereSQL = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const totalResult = await client.query(
      `
      SELECT COUNT(*)::int AS total
      FROM public.voluntarios
      ${whereSQL}
      `,
      values
    );

    const total = Number(totalResult.rows[0]?.total || 0);
    const totalPages = Math.max(Math.ceil(total / limit), 1);

    const dataValues = [...values, limit, offset];
    const limitParam = `$${dataValues.length - 1}`;
    const offsetParam = `$${dataValues.length}`;

    const dataResult = await client.query(
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
        NULL::text AS fecha_cargue
      FROM public.voluntarios
      ${whereSQL}
      ORDER BY id DESC
      LIMIT ${limitParam}
      OFFSET ${offsetParam}
      `,
      dataValues
    );

    const statsResult = await client.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (
          WHERE LOWER(COALESCE(asignado, '')) LIKE '%lider%'
             OR LOWER(COALESCE(asignado, '')) LIKE '%líder%'
        )::int AS lideres,
        COUNT(*) FILTER (
          WHERE LOWER(COALESCE(asignado, '')) LIKE '%voluntario%'
        )::int AS voluntarios,
        COUNT(*) FILTER (
          WHERE UPPER(COALESCE(estado, '')) LIKE '%VOTÓ%'
             OR UPPER(COALESCE(estado, '')) LIKE '%VOTO%'
             OR UPPER(COALESCE(estado, '')) LIKE '%SI%'
             OR UPPER(COALESCE(estado, '')) LIKE '%SÍ%'
        )::int AS votaron,
        COUNT(*) FILTER (
          WHERE UPPER(COALESCE(estado, '')) LIKE '%NO VOTÓ%'
             OR UPPER(COALESCE(estado, '')) LIKE '%NO VOTO%'
             OR UPPER(COALESCE(estado, '')) LIKE '%PENDIENTE%'
             OR COALESCE(estado, '') = ''
        )::int AS no_votaron,
        COUNT(DISTINCT NULLIF(TRIM(COALESCE(municipio, '')), ''))::int AS municipios
      FROM public.voluntarios
    `);

    const municipiosResult = await client.query(`
      SELECT
        municipio,
        COUNT(*)::int AS cantidad
      FROM public.voluntarios
      WHERE NULLIF(TRIM(COALESCE(municipio, '')), '') IS NOT NULL
      GROUP BY municipio
      ORDER BY municipio ASC
    `);

    const departamentosResult = await client.query(`
      SELECT
        departamento,
        COUNT(*)::int AS cantidad
      FROM public.voluntarios
      WHERE NULLIF(TRIM(COALESCE(departamento, '')), '') IS NOT NULL
      GROUP BY departamento
      ORDER BY departamento ASC
    `);

    return NextResponse.json({
      ok: true,
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      stats: statsResult.rows[0] || {
        total: 0,
        lideres: 0,
        voluntarios: 0,
        votaron: 0,
        no_votaron: 0,
        municipios: 0,
      },
      filtros: {
        municipios: municipiosResult.rows,
        departamentos: departamentosResult.rows,
      },
    });
  } catch (error) {
    console.error('[api/voluntarios/listar]', error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Error consultando voluntarios.',
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}