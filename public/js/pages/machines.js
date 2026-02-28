// Machines Page
async function renderMachines() {
    const content = document.getElementById('page-content');
    const isAdmin = App.user.role === 'admin';

    if (isAdmin) {
        const topbarActions = document.getElementById('topbar-actions');
        topbarActions.innerHTML = `
            <button class="btn btn-primary" id="add-machine-btn">
                <span class="material-icons-round">add</span> Yeni Makina
            </button>`;
        document.getElementById('add-machine-btn').addEventListener('click', () => showMachineForm());
    }

    content.innerHTML = `
        <div class="section">
            <div class="section-body" style="padding:0" id="machines-table">
                <div class="spinner"></div>
            </div>
        </div>`;

    loadMachines();
}

async function loadMachines() {
    const container = document.getElementById('machines-table');
    const isAdmin = App.user.role === 'admin';

    try {
        const machines = await API.get('/api/machines');
        const statusMap = { active: 'Aktif', inactive: 'Pasif', maintenance: 'Bakımda' };
        const badgeMap = { active: 'badge-success', inactive: 'badge-neutral', maintenance: 'badge-warning' };

        container.innerHTML = renderTable([
            { label: 'Makina Adı', render: r => `<strong>${r.name}</strong>` },
            { label: 'Tip', key: 'type' },
            { label: 'Durum', render: r => `<span class="badge ${badgeMap[r.status]}">${statusMap[r.status]}</span>` },
            { label: 'Kalıp Sayısı', render: r => `<span class="badge badge-info">${r.mold_count}</span>` },
            ...(isAdmin ? [{
                label: 'İşlem', render: r => `
                <div class="action-btns">
                    <button class="action-btn edit" onclick="showMachineForm(${r.id})" title="Düzenle">
                        <span class="material-icons-round">edit</span>
                    </button>
                    <button class="action-btn delete" onclick="deleteMachine(${r.id}, '${r.name}')" title="Sil">
                        <span class="material-icons-round">delete</span>
                    </button>
                </div>` }] : [])
        ], machines, { emptyIcon: 'settings', emptyTitle: 'Makina bulunamadı' });
    } catch (err) {
        container.innerHTML = `<div class="error-msg">${err.message}</div>`;
    }
}

async function showMachineForm(id = null) {
    const isEdit = id !== null;
    let machine = {};

    if (isEdit) {
        try { machine = await API.get(`/api/machines/${id}`); } catch (err) { showToast(err.message, 'error'); return; }
    }

    Modal.show(isEdit ? 'Makina Düzenle' : 'Yeni Makina', `
        <form id="machine-form">
            <div class="form-group">
                <label>Makina Adı *</label>
                <input type="text" id="maf-name" value="${machine.name || ''}" required placeholder="Örn: Otomatik Pres 1">
            </div>
            <div class="form-group">
                <label>Tip</label>
                <input type="text" id="maf-type" value="${machine.type || ''}" placeholder="Örn: Pres, Çapaklama">
            </div>
            <div class="form-group">
                <label>Durum</label>
                <select id="maf-status">
                    <option value="active" ${machine.status === 'active' ? 'selected' : ''}>Aktif</option>
                    <option value="inactive" ${machine.status === 'inactive' ? 'selected' : ''}>Pasif</option>
                    <option value="maintenance" ${machine.status === 'maintenance' ? 'selected' : ''}>Bakımda</option>
                </select>
            </div>
        </form>
    `, `
        <button class="btn btn-secondary" onclick="Modal.hide()">İptal</button>
        <button class="btn btn-primary" id="machine-save-btn">
            <span class="material-icons-round">save</span> Kaydet
        </button>
    `);

    document.getElementById('machine-save-btn').addEventListener('click', async () => {
        const data = {
            name: document.getElementById('maf-name').value,
            type: document.getElementById('maf-type').value,
            status: document.getElementById('maf-status').value,
        };
        if (!data.name) { showToast('Makina adı zorunludur.', 'error'); return; }

        try {
            if (isEdit) await API.put(`/api/machines/${id}`, data);
            else await API.post('/api/machines', data);
            showToast(isEdit ? 'Makina güncellendi.' : 'Makina eklendi.', 'success');
            Modal.hide();
            loadMachines();
        } catch (err) { showToast(err.message, 'error'); }
    });
}

function deleteMachine(id, name) {
    Modal.confirm('Makina Sil', `<strong>${name}</strong> makinasını silmek istediğinize emin misiniz?`, async () => {
        try {
            await API.delete(`/api/machines/${id}`);
            showToast('Makina silindi.', 'success');
            loadMachines();
        } catch (err) { showToast(err.message, 'error'); }
    });
}
