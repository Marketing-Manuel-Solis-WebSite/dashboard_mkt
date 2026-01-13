'use client';

import { useState, useEffect } from 'react';
import { 
  Card, Title, AreaChart, Select, SelectItem, Button, Text, 
  TabGroup, TabList, Tab, TabPanels, TabPanel,
  Table, TableHead, TableHeaderCell, TableBody, TableRow, TableCell,
  Badge, DateRangePicker, DateRangePickerValue
} from '@tremor/react';
import { 
  ArrowDownTrayIcon, PlusIcon, TrashIcon, UserCircleIcon 
} from '@heroicons/react/24/outline';
import { downloadCSV } from '@/lib/csv-exporter';

// Firebase Imports
import { auth, googleProvider, db } from '@/lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { es } from 'date-fns/locale';

// Tipos
type Project = { name: string; id: string };
type AnalyticsData = {
  timeseries: any[];
  pages: any[];
  referrers: any[];
  utms: any[];
};

export default function Home() {
  // Estado de Usuario y Proyectos
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Estado del Dashboard
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRangePickerValue>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)), // Default: últimos 30 días
    to: new Date(),
  });
  
  // Estado de Datos
  const [data, setData] = useState<AnalyticsData>({ timeseries: [], pages: [], referrers: [], utms: [] });
  const [loadingData, setLoadingData] = useState(false);

  // Estado para UI (Modales)
  const [newProjId, setNewProjId] = useState("");
  const [newProjName, setNewProjName] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  // --- 1. AUTENTICACIÓN Y CARGA DE PERFIL ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Buscar o crear documento de usuario en Firestore
        const docRef = doc(db, "users", currentUser.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const userProjects = docSnap.data().projects || [];
          setProjects(userProjects);
          // Seleccionar automáticamente el primer proyecto si existe
          if (userProjects.length > 0 && !selectedProject) setSelectedProject(userProjects[0].id);
        } else {
          // Usuario nuevo: crear perfil vacío
          await setDoc(docRef, { 
            email: currentUser.email, 
            createdAt: new Date(),
            projects: [] 
          });
        }
      }
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  // --- 2. CARGA DE DATOS DE ANALÍTICA ---
  useEffect(() => {
    if (!selectedProject || !user) return;

    async function fetchAllData() {
      setLoadingData(true);
      try {
        // Preparar fechas
        const fromStr = dateRange.from ? dateRange.from.toISOString() : 'now-30d';
        const toStr = dateRange.to ? dateRange.to.toISOString() : 'now';
        const baseParams = `projectId=${selectedProject}&from=${fromStr}&to=${toStr}`;

        // Llamadas paralelas a la API para velocidad
        const [resTs, resPages, resRefs, resUtm] = await Promise.all([
          fetch(`/api/analytics?${baseParams}&type=timeseries`),
          fetch(`/api/analytics?${baseParams}&type=stats&groupBy=path`),
          fetch(`/api/analytics?${baseParams}&type=stats&groupBy=referrer`),
          fetch(`/api/analytics?${baseParams}&type=stats&groupBy=utm_source`),
        ]);

        const jsonTs = await resTs.json();
        const jsonPages = await resPages.json();
        const jsonRefs = await resRefs.json();
        const jsonUtm = await resUtm.json();

        // Si hay error en la respuesta principal
        if (jsonTs.error) {
          console.error("Error API:", jsonTs.error);
          return;
        }

        // Mapeo de datos para Tremor (Gráficas)
        let timeseriesData = [];
        if (jsonTs.data) {
          timeseriesData = jsonTs.data.map((item: any) => ({
            date: new Date(item.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }),
            Visitantes: item.visitors,
            Vistas: item.pageviews
          }));
        }

        setData({
          timeseries: timeseriesData,
          pages: jsonPages.data || [],
          referrers: jsonRefs.data || [],
          utms: jsonUtm.data || []
        });

      } catch (error) {
        console.error("Error cargando analíticas:", error);
      } finally {
        setLoadingData(false);
      }
    }

    fetchAllData();
  }, [selectedProject, dateRange]);

  // --- HANDLERS ---
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Error login:", error);
    }
  };

  const handleLogout = () => {
    signOut(auth);
    setProjects([]);
    setSelectedProject("");
    setData({ timeseries: [], pages: [], referrers: [], utms: [] });
  };

  const addProject = async () => {
    if (!newProjId || !newProjName || !user) return;
    const newProject = { name: newProjName, id: newProjId };
    
    // Guardar en Firestore
    const docRef = doc(db, "users", user.uid);
    await updateDoc(docRef, {
      projects: arrayUnion(newProject)
    });

    // Actualizar estado local
    setProjects([...projects, newProject]);
    setSelectedProject(newProjId);
    
    // Resetear formulario
    setNewProjId("");
    setNewProjName("");
    setShowAddModal(false);
  };

  const deleteProject = async (projIdToDelete: string) => {
    if (!user || !confirm("¿Seguro que quieres eliminar este proyecto de tu lista?")) return;
    
    const projToDelete = projects.find(p => p.id === projIdToDelete);
    if (!projToDelete) return;

    const docRef = doc(db, "users", user.uid);
    await updateDoc(docRef, {
      projects: arrayRemove(projToDelete)
    });

    const updatedProjects = projects.filter(p => p.id !== projIdToDelete);
    setProjects(updatedProjects);
    if (selectedProject === projIdToDelete) {
      setSelectedProject(updatedProjects.length > 0 ? updatedProjects[0].id : "");
    }
  };

  // --- VISTA DE CARGA ---
  if (loadingAuth) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-pulse text-indigo-600 font-semibold">Cargando Dashboard...</div>
    </div>
  );

  // --- VISTA LOGIN ---
  if (!user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full text-center space-y-8 p-10 shadow-lg border border-indigo-100">
          <div className="mx-auto bg-indigo-100 p-4 rounded-full w-20 h-20 flex items-center justify-center shadow-inner">
            <UserCircleIcon className="h-12 w-12 text-indigo-600" />
          </div>
          <div>
            <Title className="text-2xl font-bold text-slate-800">Dashboard Marketing</Title>
            <Text className="mt-2 text-slate-500">Accede a tus métricas de Vercel Analytics centralizadas.</Text>
          </div>
          <Button size="xl" onClick={handleLogin} className="w-full font-semibold shadow-md hover:shadow-lg transition-all">
            Iniciar sesión con Google
          </Button>
        </Card>
      </main>
    );
  }

  // --- VISTA DASHBOARD ---
  return (
    <main className="p-6 md:p-10 min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
          <div>
            <Title className="text-3xl font-bold text-slate-800">Panel de Control</Title>
            <Text className="text-slate-500">Bienvenido, <span className="font-semibold text-indigo-600">{user.displayName}</span></Text>
          </div>
          <Button variant="light" color="red" onClick={handleLogout}>Cerrar Sesión</Button>
        </div>

        {/* Barra de Control */}
        <Card className="shadow-md border border-slate-100">
          <div className="flex flex-col xl:flex-row gap-6 justify-between items-end">
            
            {/* Selectores */}
            <div className="flex flex-col md:flex-row gap-4 w-full xl:w-2/3">
              
              {/* Selector de Proyecto */}
              <div className="w-full md:w-1/2 space-y-2">
                <Text className="font-medium text-slate-700">Sitio Web</Text>
                <div className="flex gap-2">
                  <Select value={selectedProject} onValueChange={setSelectedProject} disabled={projects.length === 0}>
                    {projects.map((proj) => (
                      <SelectItem key={proj.id} value={proj.id}>{proj.name}</SelectItem>
                    ))}
                  </Select>
                  <Button 
                    icon={PlusIcon} 
                    variant="secondary" 
                    onClick={() => setShowAddModal(!showAddModal)}
                    tooltip="Agregar nuevo sitio"
                  />
                  {selectedProject && (
                    <Button 
                      icon={TrashIcon} 
                      variant="light" 
                      color="red"
                      onClick={() => deleteProject(selectedProject)}
                      tooltip="Eliminar sitio seleccionado"
                    />
                  )}
                </div>
              </div>
              
              {/* Selector de Fecha */}
              <div className="w-full md:w-1/2 space-y-2">
                <Text className="font-medium text-slate-700">Periodo de Análisis</Text>
                <DateRangePicker 
                  className="w-full" 
                  value={dateRange} 
                  onValueChange={setDateRange} 
                  locale={es} 
                  enableSelect={false}
                  placeholder="Seleccionar rango"
                />
              </div>
            </div>

            {/* Acciones */}
            <div className="w-full xl:w-auto">
              <Button 
                icon={ArrowDownTrayIcon} 
                disabled={loadingData || !selectedProject || data.timeseries.length === 0}
                onClick={() => downloadCSV(data.timeseries, `reporte-${selectedProject}-general`)}
                className="w-full xl:w-auto"
                variant="primary"
              >
                Exportar Datos
              </Button>
            </div>
          </div>

          {/* Formulario Agregar Proyecto */}
          {showAddModal && (
            <div className="mt-6 p-6 border border-indigo-200 bg-indigo-50/30 rounded-xl animate-fadeIn">
              <div className="flex justify-between items-center mb-4">
                <Text className="font-bold text-indigo-900">Agregar Nuevo Sitio</Text>
                <Button size="xs" variant="light" onClick={() => setShowAddModal(false)}>Cancelar</Button>
              </div>
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="w-full md:w-1/3">
                  <label className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">Nombre Identificador</label>
                  <input 
                    className="w-full mt-1 p-2 rounded border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" 
                    placeholder="Ej: Landing Page Marzo"
                    value={newProjName}
                    onChange={(e) => setNewProjName(e.target.value)}
                  />
                </div>
                <div className="w-full md:w-1/3">
                  <label className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">Project ID (Vercel)</label>
                  <input 
                    className="w-full mt-1 p-2 rounded border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" 
                    placeholder="prj_xxxxxxxxxxxxxxxxxxxx"
                    value={newProjId}
                    onChange={(e) => setNewProjId(e.target.value)}
                  />
                </div>
                <Button onClick={addProject} disabled={!newProjName || !newProjId} className="w-full md:w-auto">
                  Guardar Sitio
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Visualización de Datos */}
        {selectedProject ? (
          <div className="space-y-6 animate-fadeIn">
            {/* Tarjetas KPI */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card decoration="top" decorationColor="indigo" className="shadow-sm hover:shadow-md transition-shadow">
                <Text>Visitantes Totales</Text>
                <Title className="text-3xl mt-2">{data.timeseries.reduce((acc, curr) => acc + curr.Visitantes, 0).toLocaleString()}</Title>
              </Card>
              <Card decoration="top" decorationColor="cyan" className="shadow-sm hover:shadow-md transition-shadow">
                <Text>Vistas de Página</Text>
                <Title className="text-3xl mt-2">{data.timeseries.reduce((acc, curr) => acc + curr.Vistas, 0).toLocaleString()}</Title>
              </Card>
              <Card decoration="top" decorationColor="fuchsia" className="shadow-sm hover:shadow-md transition-shadow">
                <Text>Páginas Únicas</Text>
                <Title className="text-3xl mt-2">{data.pages.length}</Title>
              </Card>
            </div>

            {/* Gráfico Principal */}
            <Card className="shadow-md">
              <Title>Tendencia de Tráfico</Title>
              {loadingData ? (
                <div className="h-72 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin"></div>
                  <Text>Actualizando datos...</Text>
                </div>
              ) : (
                <AreaChart
                  className="h-72 mt-4"
                  data={data.timeseries}
                  index="date"
                  categories={["Visitantes", "Vistas"]}
                  colors={["indigo", "cyan"]}
                  valueFormatter={(number) => Intl.NumberFormat("es-MX").format(number).toString()}
                  showAnimation={true}
                  yAxisWidth={50}
                />
              )}
            </Card>

            {/* Tablas de Detalles */}
            <TabGroup>
              <TabList variant="solid" className="mt-4">
                <Tab icon={UserCircleIcon}>Páginas (Top URLs)</Tab>
                <Tab>Fuentes (Referrers)</Tab>
                <Tab>Campañas (UTM Source)</Tab>
              </TabList>
              <TabPanels>
                
                {/* 1. Páginas */}
                <TabPanel>
                  <Card className="mt-4 shadow-md">
                    <div className="flex justify-between items-center mb-4">
                      <Title>Rendimiento por Página</Title>
                      <Button size="xs" variant="secondary" onClick={() => downloadCSV(data.pages, `paginas-${selectedProject}`)}>Descargar CSV</Button>
                    </div>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableHeaderCell>URL (Path)</TableHeaderCell>
                          <TableHeaderCell className="text-right">Visitantes</TableHeaderCell>
                          <TableHeaderCell className="text-right">Vistas</TableHeaderCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {data.pages.slice(0, 10).map((item) => (
                          <TableRow key={item.key} className="hover:bg-slate-50 transition-colors">
                            <TableCell className="font-mono text-slate-600 text-sm">{item.key}</TableCell>
                            <TableCell className="text-right font-medium">{item.visitors.toLocaleString()}</TableCell>
                            <TableCell className="text-right text-slate-500">{item.pageviews.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {data.pages.length > 10 && (
                      <div className="mt-4 text-center">
                        <Text className="text-xs text-slate-400">Mostrando top 10 de {data.pages.length} resultados. Descarga el CSV para ver todo.</Text>
                      </div>
                    )}
                  </Card>
                </TabPanel>

                {/* 2. Referrers */}
                <TabPanel>
                  <Card className="mt-4 shadow-md">
                    <div className="flex justify-between items-center mb-4">
                      <Title>Fuentes de Tráfico</Title>
                      <Button size="xs" variant="secondary" onClick={() => downloadCSV(data.referrers, `fuentes-${selectedProject}`)}>Descargar CSV</Button>
                    </div>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableHeaderCell>Fuente (Referrer)</TableHeaderCell>
                          <TableHeaderCell className="text-right">Visitantes</TableHeaderCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {data.referrers.slice(0, 10).map((item) => (
                          <TableRow key={item.key} className="hover:bg-slate-50 transition-colors">
                            <TableCell>
                              {/* Lógica simple para mostrar algo si viene vacío (tráfico directo) */}
                              {item.key ? <span className="font-medium text-slate-700">{item.key}</span> : <Badge color="gray">Directo / Desconocido</Badge>}
                            </TableCell>
                            <TableCell className="text-right font-medium">{item.visitors.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Card>
                </TabPanel>

                {/* 3. UTMs */}
                <TabPanel>
                  <Card className="mt-4 shadow-md">
                    <div className="flex justify-between items-center mb-4">
                      <Title>Campañas de Marketing (UTM Source)</Title>
                      <Button size="xs" variant="secondary" onClick={() => downloadCSV(data.utms, `utms-${selectedProject}`)}>Descargar CSV</Button>
                    </div>
                    {data.utms.length > 0 ? (
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableHeaderCell>Campaña (utm_source)</TableHeaderCell>
                            <TableHeaderCell className="text-right">Visitantes</TableHeaderCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {data.utms.map((item) => (
                            <TableRow key={item.key} className="hover:bg-amber-50/50 transition-colors">
                              <TableCell><Badge color="amber" size="lg">{item.key}</Badge></TableCell>
                              <TableCell className="text-right font-bold text-slate-700">{item.visitors.toLocaleString()}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="py-12 text-center flex flex-col items-center justify-center border-2 border-dashed rounded-lg border-slate-100 bg-slate-50/50">
                        <Text className="text-slate-400 font-medium">No se detectaron parámetros UTM en este periodo.</Text>
                        <Text className="text-xs text-slate-400 mt-2">Asegúrate de usar ?utm_source=... en tus enlaces.</Text>
                      </div>
                    )}
                  </Card>
                </TabPanel>

              </TabPanels>
            </TabGroup>
          </div>
        ) : (
          <div className="h-96 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/30 text-slate-400 gap-4 animate-fadeIn">
            <div className="bg-white p-4 rounded-full shadow-sm">
              <PlusIcon className="h-10 w-10 text-indigo-300" />
            </div>
            <div className="text-center space-y-2">
              {projects.length === 0 ? (
                <>
                  <p className="text-xl font-bold text-slate-700">Comencemos</p>
                  <p className="text-slate-500">Agrega tu primer ID de Proyecto de Vercel usando el botón (+).</p>
                </>
              ) : (
                <p className="text-lg font-medium text-slate-600">Selecciona un sitio arriba para ver sus métricas</p>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}