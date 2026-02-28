// Pending Requests Page (Onay Bekleyenler)
async function renderPending() {
    const content = document.getElementById('page-content');
    const isAdmin = App.user.role === 'admin';

    content.innerHTML = `
        <div class="section">
            <div class="section-header">
                <div class="section-title">
                    <span class="material-icons-round">pending_actions</span>
                    Onay Bekleyen Kalıp Talepleri
                </div>
            </div>
            <div class="section-body" id="pending-page-list">
                <div class="spinner"></div>
            </div>
        </div>`;

    try {
        const pending = await API.get('/api/pending');

        if (pending.length === 0) {
            document.getElementById('pending-page-list').innerHTML = `
                <div class="empty-state">
                    <span class="material-icons-round">check_circle</span>
                    <h3>Onay bekleyen talep yok</h3>
                    <p>Tüm talepler işlenmiş durumda.</p>
                </div>`;
            return;
        }

        const tableHTML = renderTable([
            { label: 'Kalıp Kodu', render: r => `<strong class="text-accent font-mono">${r.mold_code || '-'}</strong>` },
            { label: 'Ürün Kodu', render: r => `<span class="font-mono">${r.product_code}</span>` },
            { label: 'Tür', render: r => getTypeBadge(r.mold_type) },
            { label: 'Göz', render: r => r.eye_count || '-' },
            { label: 'Pim', render: r => r.pin_count || '-' },
            { label: 'Durum', render: r => `<span class="badge badge-pending">Bekliyor</span>` },
            { label: 'Gönderen', render: r => r.submitted_by_name || 'Bilinmiyor' },
            { label: 'Tarih', render: r => formatDate(r.submitted_at) },
            ...(isAdmin ? [{
                label: 'İşlem', render: r => `
                <div class="action-btns">
                    <button class="btn btn-success btn-sm" onclick="approveFromPage(${r.id})" title="Onayla">
                        <span class="material-icons-round">check</span>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="rejectFromPage(${r.id})" title="Reddet">
                        <span class="material-icons-round">close</span>
                    </button>
                </div>` }] : [])
        ], pending, { emptyIcon: 'pending_actions', emptyTitle: 'Onay bekleyen yok' });

        document.getElementById('pending-page-list').innerHTML = tableHTML;
    } catch (err) {
        document.getElementById('pending-page-list').innerHTML = `<div class="error-msg">${err.message}</div>`;
    }
}

async function approveFromPage(id) {
    try {
        await API.post(`/api/pending/${id}/approve`);
        showToast('Kalıp onaylandı ve eklendi.', 'success');
        renderPending(); // Refresh list
        App.updatePendingBadge();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function rejectFromPage(id) {
    Modal.confirm('Kalıbı Reddet', 'Bu kalıp talebini reddetmek istediğinize emin misiniz?', async () => {
        try {
            await API.post(`/api/pending/${id}/reject`);
            showToast('Kalıp talebi reddedildi.', 'info');
            renderPending();
            App.updatePendingBadge();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });
}
