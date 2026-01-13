import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');
  const type = searchParams.get('type') || 'timeseries'; // 'timeseries' | 'stats'
  const groupBy = searchParams.get('groupBy'); // 'path' | 'referrer' | 'utm_source' | etc.
  const from = searchParams.get('from') || 'now-30d';
  const to = searchParams.get('to') || 'now';
  
  if (!projectId) {
    return NextResponse.json({ error: 'Falta el Project ID' }, { status: 400 });
  }

  const token = process.env.VERCEL_API_TOKEN;
  const teamId = process.env.VERCEL_TEAM_ID;
  
  // Construcción dinámica de la URL basada en el tipo de reporte
  let baseUrl = 'https://vercel.com/api/v1/web-analytics';
  let endpoint = '';
  // Parámetros base
  let params = `?projectId=${projectId}&environment=production&from=${from}&to=${to}`;

  if (teamId) params += `&teamId=${teamId}`;

  if (type === 'timeseries') {
    endpoint = '/timeseries';
  } else if (type === 'stats') {
    endpoint = '/stats';
    if (groupBy) params += `&groupBy=${groupBy}&limit=50`; // Traemos el top 50
  }

  const url = `${baseUrl}${endpoint}${params}`;

  try {
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        // User-Agent custom para evitar bloqueos de Vercel
        'User-Agent': 'Mozilla/5.0 (Compatible; Analytics-Dashboard/2.0)',
      },
      cache: 'no-store' 
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`Error Vercel API (${url}):`, errorText);
      return NextResponse.json({ 
        error: 'Error conectando a Vercel', 
        details: errorText,
        hint: 'Verifica que el VERCEL_API_TOKEN sea válido y tenga permisos.' 
      }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}