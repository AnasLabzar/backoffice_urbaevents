// lib/analytics-helper.ts

export const getCreatedAtFromId = (id: string) => {
    if (!id || id.length < 8) return new Date();
    const timestamp = parseInt(id.substring(0, 8), 16) * 1000;
    return new Date(timestamp);
};

export const downloadCSV = (filename: string, headers: string[], rows: any[]) => {
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map((item: any) => `"${String(item || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};