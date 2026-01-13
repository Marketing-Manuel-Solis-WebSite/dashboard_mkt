import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');
  
  if (!projectId) {
    return NextResponse.json({ error: 'Falta el Project ID' }, { status: 400 });
  }

  const token = process.env.VERCEL_API_TOKEN;
  const teamId = process.env.VERCEL_TEAM_ID;
  
  // ESTRATEGIA DEFINITIVA:
  // 1. Usamos 'vercel.com' porque es donde vive la API de analítica real.
  // 2. Usamos 'timeseries' que es el endpoint exacto para gráficos.
  let url = `https://vercel.com/api/v1/web-analytics/timeseries?projectId=${projectId}&environment=production&from=now-30d&to=now`;
  
  if (teamId) {
    url += `&teamId=${teamId}`;
  }

  try {
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        // A veces Vercel rechaza peticiones sin User-Agent desde servidores
        'User-Agent': 'Mozilla/5.0 (Compatible; Analytics-Dashboard/1.0)',
      },
      cache: 'no-store' 
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("--- INTENTO DE CONEXIÓN FALLIDO ---");
      console.error(`URL: ${url}`);
      console.error(`Status: ${res.status}`);
      console.error(`Respuesta: ${errorText}`);
      
      // Si falla este endpoint, intentamos el de "uso general" como fallback
      // Esto nos dará ancho de banda/peticiones si no podemos ver visitantes
      return NextResponse.json({ 
        error: 'No se pudo conectar a Web Analytics', 
        details: errorText,
        debugUrl: url 
      }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
    
  } catch (error: any) {
    console.error("Error interno:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}