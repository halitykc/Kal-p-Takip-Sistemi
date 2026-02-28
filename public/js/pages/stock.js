// Stock Movements Page
async function renderStock() {
    const content = document.getElementById('page-content');
    const isAdmin = App.user.role === 'admin';

    const topbarActions = document.getElementById('topbar-actions');
    let actionHTML = '';
    if (isAdmin) {
        actionHTML = `
            <button class="btn btn-success btn-sm" id="stock-in-btn">
                <span class="material-icons-round">login</span> Giriş Kaydet
            </button>
            <button class="btn btn-danger btn-sm" id="stock-out-btn">
                <span class="material-icons-round">logout</span> Çıkış Kaydet
            </button>`;
    }
    actionHTML += `
        <button class="btn btn-ghost btn-sm" id="stock-export-btn" title="Excel'e Aktar">
            <span class="material-icons-round">download</span> Excel
        </button>`;
    topbarActions.innerHTML = actionHTML;

    if (isAdmin) {
        document.getElementById('stock-in-btn').addEventListener('click', () => showStockForm('Giriş'));
        document.getElementById('stock-out-btn').addEventListener('click', () => showStockForm('Çıkış'));
    }
    document.getElementById('stock-export-btn').addEventListener('click', () => {
        const params = new URLSearchParams();
        const mt = document.getElementById('stock-type-filter').value;
        const df = document.getElementById('stock-from').value;
        const dt = document.getElementById('stock-to').value;
        if (mt) params.set('movement_type', mt);
        if (df) params.set('date_from', df);
        if (dt) params.set('date_to', dt);
        window.open(`/api/export/stock?${params}`, '_blank');
    });

    content.innerHTML = `
        <div class="filters-bar">
            <div class="input-icon">
                <span class="material-icons-round">search</span>
                <input type="text" id="stock-search" placeholder="Kalıp veya ürün kodu ara...">
            </div>
            <select id="stock-type-filter">
                <option value="">Tüm Hareketler</option>
                <option value="Giriş">Giriş</option>
                <option value="Çıkış">Çıkış</option>
            </select>
            <input type="date" id="stock-from" placeholder="Başlangıç">
            <input type="date" id="stock-to" placeholder="Bitiş">
        </div>
        <div class="section">
            <div class="section-body" style="padding:0" id="stock-table">
                <div class="spinner"></div>
            </div>
        </div>`;

    document.getElementById('stock-type-filter').addEventListener('change', loadStockMovements);
    document.getElementById('stock-from').addEventListener('change', loadStockMovements);
    document.getElementById('stock-to').addEventListener('change', loadStockMovements);
    let debounce;
    document.getElementById('stock-search').addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(loadStockMovements, 300);
    });

    loadStockMovements();
}

async function loadStockMovements() {
    const container = document.getElementById('stock-table');
    const movement_type = document.getElementById('stock-type-filter').value;
    const date_from = document.getElementById('stock-from').value;
    const date_to = document.getElementById('stock-to').value;
    const search = document.getElementById('stock-search') ? document.getElementById('stock-search').value : '';

    const params = new URLSearchParams();
    if (movement_type) params.set('movement_type', movement_type);
    if (date_from) params.set('date_from', date_from);
    if (date_to) params.set('date_to', date_to);

    try {
        let movements = await API.get(`/api/stock?${params}`);

        // Client-side search filter
        if (search) {
            const q = search.toLowerCase();
            movements = movements.filter(m =>
                (m.mold_code && m.mold_code.toLowerCase().includes(q)) ||
                (m.product_code && m.product_code.toLowerCase().includes(q))
            );
        }

        container.innerHTML = renderTable([
            { label: 'Tarih', render: r => `<strong>${formatDate(r.movement_date)}</strong>` },
            { label: 'Hareket', render: r => getMovementBadge(r.movement_type) },
            { label: 'Kalıp Kodu', render: r => `<span class="font-mono text-accent">${r.mold_code}</span>` },
            { label: 'Ürün Kodu', render: r => `<span class="font-mono">${r.product_code}</span>` },
            { label: 'Tür', render: r => getTypeBadge(r.mold_type) },
            { label: 'Not', key: 'notes' },
            { label: 'Kullanıcı', key: 'created_by_name' },
        ], movements, { emptyIcon: 'swap_vert', emptyTitle: 'Stok hareketi bulunamadı' });
    } catch (err) {
        container.innerHTML = `<div class="error-msg">${err.message}</div>`;
    }
}

async function showStockForm(type) {
    let molds = [];
    try {
        molds = await API.get('/api/molds');
    } catch (err) {
        showToast(err.message, 'error');
        return;
    }

    const moldOpts = molds.map(m =>
        `<option value="${m.id}">${m.mold_code} — ${m.product_code} (${m.mold_type})</option>`
    ).join('');

    const today = new Date().toISOString().split('T')[0];
    const isEntry = type === 'Giriş';

    Modal.show(`Stok ${type} Kaydı`, `
        <form id="stock-form">
            <div class="form-group">
                <label>Kalıp *</label>
                <select id="sf-mold" required>
                    <option value="">Kalıp seçin...</option>
                    ${moldOpts}
                </select>
            </div>
            <div class="form-group">
                <label>Tarih *</label>
                <input type="date" id="sf-date" value="${today}" required>
            </div>
            <div class="form-group">
                <label>Not</label>
                <textarea id="sf-notes" rows="2" placeholder="İsteğe bağlı not..."></textarea>
            </div>
        </form>
    `, `
        <button class="btn btn-secondary" onclick="Modal.hide()">İptal</button>
        <button class="btn ${isEntry ? 'btn-success' : 'btn-danger'}" id="stock-save-btn">
            <span class="material-icons-round">${isEntry ? 'login' : 'logout'}</span> ${type} Kaydet
        </button>
    `);

    document.getElementById('stock-save-btn').addEventListener('click', async () => {
        const data = {
            mold_id: document.getElementById('sf-mold').value,
            movement_type: type,
            movement_date: document.getElementById('sf-date').value,
            notes: document.getElementById('sf-notes').value || null,
        };

        if (!data.mold_id || !data.movement_date) {
            showToast('Kalıp ve tarih zorunludur.', 'error');
            return;
        }

        try {
            await API.post('/api/stock', data);
            showToast(`${type} kaydedildi.`, 'success');
            Modal.hide();
            loadStockMovements();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });
}
