// Reusable Table Component
function renderTable(columns, rows, options = {}) {
    if (rows.length === 0) {
        return `<div class="empty-state">
            <span class="material-icons-round">${options.emptyIcon || 'inventory_2'}</span>
            <h3>${options.emptyTitle || 'Kayıt bulunamadı'}</h3>
            <p>${options.emptyText || ''}</p>
        </div>`;
    }

    const headerHTML = columns.map(c => `<th>${c.label}</th>`).join('');
    const rowsHTML = rows.map(row => {
        const cells = columns.map(c => `<td>${c.render ? c.render(row) : (row[c.key] || '-')}</td>`).join('');
        return `<tr>${cells}</tr>`;
    }).join('');

    return `<div class="table-wrapper"><table>
        <thead><tr>${headerHTML}</tr></thead>
        <tbody>${rowsHTML}</tbody>
    </table></div>`;
}
