'use client';

import { useState, useEffect } from 'react';
import { Card, Title, AreaChart, Select, SelectItem, Button, Text } from '@tremor/react';
import { MY_PROJECTS } from '@/lib/projects';
import { downloadCSV } from '@/lib/csv-exporter';
import { ArrowDownTrayIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function Home() {
  const [selectedProject, setSelectedProject] = useState(MY_PROJECTS[0].id);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setErrorMsg(null);
      
      try {
        const res = await fetch(`/api/analytics?projectId=${selectedProject}`);
        const json = await res.json();

        console.log("Respuesta de API:", json); // Mantén la consola abierta para ver esto

        if (!res.ok) {
          throw new Error(json.details || "Error al conectar con Vercel");
        }

        // LÓGICA DE MAPEO ROBUSTA
        // Vercel puede devolver los datos en 'data' o directamente como array
        let rawData = [];
        if (Array.isArray(json.data)) rawData = json.data;
        else if (Array.isArray(json)) rawData = json;
        
        if (rawData.length > 0) {
          const formatted = rawData.map((item: any) => ({
            // Probamos todas las posibles llaves de fecha que Vercel ha usado históricamente
            date: new Date(item.date || item.start || item.x).toLocaleDateString(),
            Visitors: item.visitors || item.y || 0,
            Pageviews: item.pageviews || 0
          }));
          setChartData(formatted);
        } else {
          setChartData([]);
        }

      } catch (error: any) {
        console.error("Error fetching data:", error);
        setErrorMsg(error.message);
        setChartData([]);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [selectedProject]);

  return (
    <main className="p-10 min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Title className="text-3xl font-bold text-slate-800">Vercel Analytics Hub</Title>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 flex items-start gap-3">
             <ExclamationTriangleIcon className="h-6 w-6 shrink-0" />
             <div>
               <p className="font-bold">Error de Conexión</p>
               <p className="text-sm">{errorMsg}</p>
               <p className="text-xs mt-2 text-red-500">
                 Tip: Verifica que tu Token tenga permisos y que el ID del Proyecto y Team ID sean correctos en .env.local
               </p>
             </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-4 mb-8 justify-between items-end bg-white p-4 rounded-lg shadow-sm border border-slate-200">
          <div className="w-full md:w-1/3">
            <Text className="mb-1">Seleccionar Proyecto</Text>
            <Select 
              value={selectedProject} 
              onValueChange={setSelectedProject}
              enableClear={false}
            >
              {MY_PROJECTS.map((proj) => (
                <SelectItem key={proj.id} value={proj.id}>
                  {proj.name}
                </SelectItem>
              ))}
            </Select>
          </div>

          <Button 
            icon={ArrowDownTrayIcon} 
            variant="secondary" 
            onClick={() => downloadCSV(chartData, "reporte-analytics")}
            disabled={loading || chartData.length === 0}
          >
            Exportar CSV
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <Card>
            <Title>Tráfico (Últimos 30 días)</Title>
            {loading ? (
              <div className="h-72 flex flex-col items-center justify-center text-gray-400 gap-2">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <span>Cargando datos...</span>
              </div>
            ) : chartData.length > 0 ? (
              <AreaChart
                className="h-72 mt-4"
                data={chartData}
                index="date"
                categories={["Visitors", "Pageviews"]}
                colors={["indigo", "cyan"]}
                valueFormatter={(number) => Intl.NumberFormat("us").format(number).toString()}
                yAxisWidth={40}
                showAnimation={true}
              />
            ) : (
              <div className="h-72 flex flex-col items-center justify-center text-gray-400 bg-slate-50 rounded-lg mt-4 border-dashed border-2 border-slate-200">
                <p>No hay datos disponibles.</p>
                <p className="text-sm">¿Tienes "Web Analytics" activado en este proyecto en Vercel?</p>
              </div>
            )}
          </Card>

          {!loading && chartData.length > 0 && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card decoration="top" decorationColor="indigo">
                  <Text>Total Visitantes</Text>
                  <Title>{chartData.reduce((acc, curr) => acc + curr.Visitors, 0).toLocaleString()}</Title>
                </Card>
                <Card decoration="top" decorationColor="cyan">
                  <Text>Total Vistas de Página</Text>
                  <Title>{chartData.reduce((acc, curr) => acc + curr.Pageviews, 0).toLocaleString()}</Title>
                </Card>
             </div>
          )}
        </div>
      </div>
    </main>
  );
}