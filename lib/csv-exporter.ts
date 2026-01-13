export function downloadCSV(data: any[], filename: string) {
  if (!data || data.length === 0) {
    alert("No hay datos para exportar");
    return;
  }

  // Detectamos dinámicamente las columnas basándonos en el primer objeto
  const headers = Object.keys(data[0]);
  
  const csvRows = [
    headers.join(','), 
    ...data.map(row => {
      return headers.map(fieldName => {
        const val = row[fieldName];
        // Escapar comillas dobles y manejar comas dentro del contenido
        const escaped = ('' + (val ?? '')).replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(',');
    })
  ];

  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.setAttribute('hidden', '');
  a.setAttribute('href', url);
  a.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}