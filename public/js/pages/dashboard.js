// Dashboard Page
async function renderDashboard() {
    const content = document.getElementById('page-content');
    content.innerHTML = '<div class="spinner"></div>';

    try {
        const stats = await API.get('/api/dashboard/stats');
        const isAdmin = App.user.role === 'admin';

        // Stats cards
        const stokta = stats.byStatus.filter(s => s.status !== 'Çıkış' && s.status !== 'Hurda').reduce((a, b) => a + b.count, 0);
        const cikis = stats.byStatus.find(s => s.status === 'Çıkış');
        const bakimda = stats.byStatus.find(s => s.status === 'Bakımda');
        const arizali = stats.byStatus.find(s => s.status === 'Arızalı');

        let html = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon amber">
                    <span class="material-icons-round">view_in_ar</span>
                </div>
                <div class="stat-info">
                    <h3>${stats.total}</h3>
                    <p>Toplam Kalıp</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon green">
                    <span class="material-icons-round">inventory_2</span>
                </div>
                <div class="stat-info">
                    <h3>${stokta}</h3>
                    <p>Stokta</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon red">
                    <span class="material-icons-round">logout</span>
                </div>
                <div class="stat-info">
                    <h3>${cikis ? cikis.count : 0}</h3>
                    <p>Çıkış Yapan</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon orange">
                    <span class="material-icons-round">build</span>
                </div>
                <div class="stat-info">
                    <h3>${(bakimda ? bakimda.count : 0) + (arizali ? arizali.count : 0)}</h3>
                    <p>Bakımda / Arızalı</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon purple">
                    <span class="material-icons-round">pending_actions</span>
                </div>
                <div class="stat-info">
                    <h3>${stats.pendingCount}</h3>
                    <p>Onay Bekleyen</p>
                </div>
            </div>
        </div>`;

        // Pending approvals (admin only)
        if (isAdmin && stats.pendingCount > 0) {
            html += `<div class="section">
                <div class="section-header">
                    <div class="section-title">
                        <span class="material-icons-round">pending_actions</span>
                        Onay Bekleyen Kalıplar
                    </div>
                </div>
                <div class="section-body" id="pending-list">
                    <div class="spinner"></div>
                </div>
            </div>`;
        }

        // Status breakdown
        if (stats.byStatus.length > 0) {
            html += `<div class="section">
                <div class="section-header">
                    <div class="section-title">
                        <span class="material-icons-round">bar_chart</span>
                        Durum Dağılımı
                    </div>
                </div>
                <div class="section-body">
                    <div class="status-chips">
                        ${stats.byStatus.map(s => `
                            <div class="status-chip">
                                ${getStatusBadge(s.status)}
                                <span class="status-count">${s.count}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>`;
        }

        // Product completeness matrix
        html += `<div class="section">
            <div class="section-header">
                <div class="section-title">
                    <span class="material-icons-round">fact_check</span>
                    Ürün Bazlı Kalıp Durumu
                </div>
                <div style="display:flex;gap:8px;align-items:center">
                    <div class="input-icon" style="min-width:220px">
                        <span class="material-icons-round">search</span>
                        <input type="text" id="product-search" placeholder="Ürün kodu ara..." style="padding:8px 14px 8px 36px;font-size:13px">
                    </div>
                    <button class="btn btn-ghost btn-sm" onclick="window.open('/api/export/molds','_blank')" title="Excel'e Aktar">
                        <span class="material-icons-round">download</span>
                    </button>
                </div>
            </div>
            <div class="section-body" style="padding:0" id="product-completeness-table"></div>
        </div>`;

        // Type distribution chart + Machine utilization
        html += `<div style="display:grid; grid-template-columns: 1fr 1fr; gap: 16px;" class="chart-grid">
            <div class="section">
                <div class="section-header">
                    <div class="section-title">
                        <span class="material-icons-round">pie_chart</span>
                        Türe Göre Dağılım
                    </div>
                </div>
                <div class="section-body">
                    <div class="chart-bars" id="type-chart"></div>
                </div>
            </div>
            <div class="section">
                <div class="section-header">
                    <div class="section-title">
                        <span class="material-icons-round">settings</span>
                        Makina Kullanımı
                    </div>
                </div>
                <div class="section-body">
                    <div class="chart-bars" id="machine-chart"></div>
                </div>
            </div>
        </div>`;

        // Recent movements
        html += `<div class="section">
            <div class="section-header">
                <div class="section-title">
                    <span class="material-icons-round">swap_vert</span>
                    Son Stok Hareketleri
                </div>
                <button class="btn btn-ghost btn-sm" onclick="window.open('/api/export/stock','_blank')" title="Excel'e Aktar">
                    <span class="material-icons-round">download</span> Excel
                </button>
            </div>
            <div class="section-body" style="padding:0">
                ${renderTable([
            { label: 'Ürün Kodu', key: 'product_code' },
            { label: 'Tarih', render: r => formatDate(r.movement_date) },
            { label: 'Hareket', render: r => getMovementBadge(r.movement_type) },
            { label: 'Kalıp Kodu', key: 'mold_code' },
            { label: 'Tür', render: r => getTypeBadge(r.mold_type) },
            { label: 'Kullanıcı', key: 'created_by_name' },
        ], stats.recentMovements, { emptyTitle: 'Henüz stok hareketi yok' })}
            </div>
        </div>`;

        content.innerHTML = html;

        // Render charts
        renderTypeChart(stats.byType);
        renderMachineChart(stats.machineUtilization);

        // Render product completeness
        window._productData = stats.productCompleteness || [];
        renderProductCompleteness(window._productData);
        document.getElementById('product-search').addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase();
            const filtered = window._productData.filter(p => p.product_code.toLowerCase().includes(q));
            renderProductCompleteness(filtered);
        });

        // Load pending if admin
        if (isAdmin && stats.pendingCount > 0) {
            loadPendingApprovals();
        }

    } catch (err) {
        content.innerHTML = `<div class="error-msg">${err.message}</div>`;
    }
}

function renderTypeChart(byType) {
    const container = document.getElementById('type-chart');
    if (!container || byType.length === 0) {
        if (container) container.innerHTML = '<div class="text-muted" style="text-align:center;padding:40px">Veri yok</div>';
        return;
    }
    const max = Math.max(...byType.map(t => t.count), 1);
    const colors = { 'Kalıp': 'blue', 'Zımba': 'amber', 'Plaka': 'green' };
    container.innerHTML = byType.map(t => `
        <div class="chart-bar-item">
            <div class="chart-bar ${colors[t.mold_type] || 'amber'}" style="height: ${(t.count / max) * 100}%">
                <span class="chart-bar-value">${t.count}</span>
            </div>
            <span class="chart-bar-label">${t.mold_type}</span>
        </div>
    `).join('');
}

function renderMachineChart(machines) {
    const container = document.getElementById('machine-chart');
    if (!container || machines.length === 0) {
        if (container) container.innerHTML = '<div class="text-muted" style="text-align:center;padding:40px">Veri yok</div>';
        return;
    }
    const filtered = machines.filter(m => m.mold_count > 0);
    if (filtered.length === 0) {
        container.innerHTML = '<div class="text-muted" style="text-align:center;padding:40px">Makinalara atanmış kalıp yok</div>';
        return;
    }
    const max = Math.max(...filtered.map(m => m.mold_count), 1);
    container.innerHTML = filtered.map((m, i) => `
        <div class="chart-bar-item">
            <div class="chart-bar ${['amber', 'blue', 'green'][i % 3]}" style="height: ${(m.mold_count / max) * 100}%">
                <span class="chart-bar-value">${m.mold_count}</span>
            </div>
            <span class="chart-bar-label">${m.name}</span>
        </div>
    `).join('');
}

function renderProductCompleteness(data) {
    const container = document.getElementById('product-completeness-table');
    if (!container) return;

    const check = (count) => count > 0
        ? `<span style="color:var(--success);font-size:18px">✅</span> <span class="text-muted" style="font-size:11px">(${count})</span>`
        : `<span style="color:var(--steel-700);font-size:18px">❌</span>`;

    container.innerHTML = renderTable([
        { label: 'Ürün Kodu', render: r => `<a href="#" onclick="showProductDetail('${r.product_code}'); return false;" class="text-accent font-mono" style="cursor:pointer;text-decoration:underline;font-weight:700">${r.product_code}</a>` },
        { label: 'Kalıp Üst', render: r => check(r.kalip_ust) },
        { label: 'Kalıp Alt', render: r => check(r.kalip_alt) },
        { label: 'Zımba', render: r => check(r.zimba) },
        { label: 'Plaka', render: r => check(r.plaka) },
        {
            label: 'Durum', render: r => {
                const total = (r.kalip_ust > 0 ? 1 : 0) + (r.kalip_alt > 0 ? 1 : 0) + (r.zimba > 0 ? 1 : 0) + (r.plaka > 0 ? 1 : 0);
                if (total === 4) return '<span class="badge badge-success">Tam Takım</span>';
                return `<span class="badge badge-danger">Eksik (${4 - total})</span>`;
            }
        }
    ], data, { emptyIcon: 'fact_check', emptyTitle: 'Henüz ürün verisi yok', emptyText: 'Kalıp ekledikçe burada görünecek.' });
}

async function showProductDetail(productCode) {
    try {
        const molds = await API.get(`/api/molds?product_code=${encodeURIComponent(productCode)}`);

        const bodyHTML = molds.length === 0
            ? '<div class="empty-state"><h3>Bu ürüne ait kalıp bulunamadı</h3></div>'
            : renderTable([
                { label: 'Kalıp Kodu', render: r => `<strong class="font-mono">${r.mold_code}</strong>` },
                { label: 'Tür', render: r => getTypeBadge(r.mold_type) },
                { label: 'Pozisyon', render: r => r.mold_type === 'Kalıp' ? `<span class="badge badge-neutral">${r.position === 'Üst' ? 'Üst' : r.position === 'Alt' ? 'Alt' : 'Belirtilmedi'}</span>` : '-' },
                { label: 'Durum', render: r => getStatusBadge(r.status) },
                { label: 'Göz', render: r => r.eye_count || '-' },
                { label: 'Pim', render: r => r.pin_count || '-' },
                { label: 'Makina', render: r => r.machine_name || '-' },
            ], molds);

        Modal.show(`${productCode} — Kalıp Detayı`, bodyHTML, `
            <button class="btn btn-secondary" onclick="Modal.hide()">Kapat</button>
        `);
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function loadPendingApprovals() {
    const container = document.getElementById('pending-list');
    try {
        const pending = await API.get('/api/pending');
        container.innerHTML = pending.map(p => `
            <div class="pending-card" id="pending-${p.id}">
                <div class="pending-info">
                    <h4>${p.mold_code} — ${p.product_code}</h4>
                    <p>${getTypeBadge(p.mold_type)} &nbsp; Gönderen: ${p.submitted_by_name || 'Bilinmiyor'} &nbsp; ${formatDate(p.submitted_at)}</p>
                </div>
                <div class="pending-actions">
                    <button class="btn btn-success btn-sm" onclick="approvePending(${p.id})">
                        <span class="material-icons-round">check</span> Onayla
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="rejectPending(${p.id})">
                        <span class="material-icons-round">close</span> Reddet
                    </button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        container.innerHTML = `<p class="text-danger">${err.message}</p>`;
    }
}

async function approvePending(id) {
    try {
        await API.post(`/api/pending/${id}/approve`);
        showToast('Kalıp onaylandı ve eklendi.', 'success');
        const el = document.getElementById(`pending-${id}`);
        if (el) el.remove();
        App.updatePendingBadge();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function rejectPending(id) {
    Modal.confirm('Kalıbı Reddet', 'Bu kalıp kaydını reddetmek istediğinize emin misiniz?', async () => {
        try {
            await API.post(`/api/pending/${id}/reject`);
            showToast('Kalıp reddedildi.', 'info');
            const el = document.getElementById(`pending-${id}`);
            if (el) el.remove();
            App.updatePendingBadge();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });
}
