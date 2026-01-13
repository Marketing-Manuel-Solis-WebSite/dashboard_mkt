// lib/csv-exporter.ts
export function downloadCSV(data: any[], filename: string) {
  if (!data || data.length === 0) {
    alert("No hay datos para exportar");
    return;
  }

  // Definimos las columnas del Excel
  const headers = ["Fecha", "Visitantes"];
  
  const csvRows = [
    headers.join(','), 
    ...data.map(row => {
      // Aseguramos que la fecha se lea bien en Excel
      const date = row.date; 
      const visitors = row.Visitors;
      return `${date},${visitors}`;
    })
  ];

  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.setAttribute('hidden', '');
  a.setAttribute('href', url);
  a.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}