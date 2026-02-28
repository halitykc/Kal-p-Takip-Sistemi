// Molds Page
async function renderMolds() {
    const content = document.getElementById('page-content');
    const canWrite = App.user.role === 'admin' || App.user.role === 'operator';

    // Add button for admin/operator
    const topbarActions = document.getElementById('topbar-actions');
    if (canWrite) {
        topbarActions.innerHTML = `
            <button class="btn btn-primary" id="add-mold-btn">
                <span class="material-icons-round">add</span> Yeni Kalıp
            </button>`;
        document.getElementById('add-mold-btn').addEventListener('click', () => showMoldForm());
    }

    content.innerHTML = `
        <div class="filters-bar">
            <div class="input-icon">
                <span class="material-icons-round">search</span>
                <input type="text" id="mold-search" placeholder="Kalıp veya ürün kodu ara...">
            </div>
            <select id="filter-type">
                <option value="">Tüm Türler</option>
                <option value="Kalıp">Kalıp</option>
                <option value="Zımba">Zımba</option>
                <option value="Plaka">Plaka</option>
            </select>
            <select id="filter-status">
                <option value="">Tüm Durumlar</option>
                <option value="Yeni">Yeni</option>
                <option value="Stokta">Stokta</option>
                <option value="Çıkış">Çıkış</option>
                <option value="Bakımda">Bakımda</option>
                <option value="Arızalı">Arızalı</option>
                <option value="Revizyon">Revizyon</option>
                <option value="Depoda">Depoda</option>
                <option value="Hurda">Hurda</option>
            </select>
            <select id="filter-machine">
                <option value="">Tüm Makinalar</option>
            </select>
        </div>
        <div class="section">
            <div class="section-body" style="padding:0" id="molds-table">
                <div class="spinner"></div>
            </div>
        </div>`;

    // Load machines for filter
    try {
        const machines = await API.get('/api/machines');
        const machineSelect = document.getElementById('filter-machine');
        machines.forEach(m => {
            machineSelect.innerHTML += `<option value="${m.id}">${m.name}</option>`;
        });
    } catch { }

    // Event listeners
    let debounce;
    document.getElementById('mold-search').addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(loadMolds, 300);
    });
    document.getElementById('filter-type').addEventListener('change', loadMolds);
    document.getElementById('filter-status').addEventListener('change', loadMolds);
    document.getElementById('filter-machine').addEventListener('change', loadMolds);

    loadMolds();
}

async function loadMolds() {
    const container = document.getElementById('molds-table');
    const search = document.getElementById('mold-search').value;
    const mold_type = document.getElementById('filter-type').value;
    const status = document.getElementById('filter-status').value;
    const machine_id = document.getElementById('filter-machine').value;

    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (mold_type) params.set('mold_type', mold_type);
    if (status) params.set('status', status);
    if (machine_id) params.set('machine_id', machine_id);

    try {
        const molds = await API.get(`/api/molds?${params}`);
        const isAdmin = App.user.role === 'admin';

        container.innerHTML = renderTable([
            { label: 'Ürün Kodu', render: r => `<span class="font-mono">${r.product_code}</span>` },
            { label: 'Kalıp Kodu', render: r => `<strong class="text-accent font-mono">${r.mold_code}</strong>` },
            { label: 'Tür', render: r => getTypeBadge(r.mold_type) },
            { label: 'Göz', render: r => r.mold_type !== 'Zımba' ? r.eye_count : '-' },
            { label: 'Pim', render: r => r.mold_type === 'Kalıp' ? r.pin_count : '-' },
            { label: 'Pozisyon', render: r => r.mold_type === 'Kalıp' && r.position !== 'none' ? `<span class="badge badge-neutral">${r.position}</span>` : '-' },
            { label: 'Durum', render: r => getStatusBadge(r.status) },
            { label: 'Makina', render: r => r.machine_name || '-' },
            ...(isAdmin ? [{
                label: 'İşlem', render: r => `
                <div class="action-btns">
                    <button class="action-btn edit" onclick="showMoldForm(${r.id})" title="Düzenle">
                        <span class="material-icons-round">edit</span>
                    </button>
                    <button class="action-btn delete" onclick="deleteMold(${r.id}, '${r.mold_code}')" title="Sil">
                        <span class="material-icons-round">delete</span>
                    </button>
                </div>` }] : [])
        ], molds, { emptyIcon: 'view_in_ar', emptyTitle: 'Kalıp bulunamadı', emptyText: 'Filtreleri değiştirmeyi deneyin.' });
    } catch (err) {
        container.innerHTML = `<div class="error-msg">${err.message}</div>`;
    }
}

async function showMoldForm(id = null) {
    const isEdit = id !== null;
    let mold = {};
    let machines = [];

    try {
        machines = await API.get('/api/machines');
        if (isEdit) mold = await API.get(`/api/molds/${id}`);
    } catch (err) {
        showToast(err.message, 'error');
        return;
    }

    const machineOpts = machines.map(m =>
        `<option value="${m.id}" ${mold.machine_id == m.id ? 'selected' : ''}>${m.name}</option>`
    ).join('');

    const formHTML = `
        <form id="mold-form">
            <div class="form-row">
                <div class="form-group">
                    <label>Kalıp Türü *</label>
                    <select id="mf-type" required>
                        <option value="">Seçin</option>
                        <option value="Kalıp" ${mold.mold_type === 'Kalıp' ? 'selected' : ''}>Kalıp</option>
                        <option value="Zımba" ${mold.mold_type === 'Zımba' ? 'selected' : ''}>Zımba</option>
                        <option value="Plaka" ${mold.mold_type === 'Plaka' ? 'selected' : ''}>Plaka</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Kalıp Kodu * (sadece rakam)</label>
                    <input type="text" id="mf-code" value="${mold.mold_code || ''}" required pattern="[0-9]*" inputmode="numeric" placeholder="Örn: 12345">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Ürün Kodu *</label>
                    <input type="text" id="mf-product" value="${mold.product_code || ''}" required style="text-transform:uppercase" placeholder="Büyük harf ile giriniz">
                </div>
                <div class="form-group">
                    <label>Durumu</label>
                    <select id="mf-status">
                        ${(isEdit ? ['Yeni', 'Revizyon', 'Hurda'] : ['Yeni', 'Revizyon']).map(s =>
        `<option value="${s}" ${mold.status === s ? 'selected' : ''}>${s}</option>`
    ).join('')}
                    </select>
                </div>
            </div>
            <div class="form-row" id="mf-eye-row">
                <div class="form-group">
                    <label>Göz Sayısı</label>
                    <input type="number" id="mf-eye" value="${mold.eye_count || 0}" min="0">
                </div>
                <div class="form-group" id="mf-pin-group">
                    <label>Pim Sayısı</label>
                    <input type="number" id="mf-pin" value="${mold.pin_count || 0}" min="0">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Makina</label>
                    <select id="mf-machine">
                        <option value="">Seçin</option>
                        ${machineOpts}
                    </select>
                </div>
                <div class="form-group">
                    <label>Geliş Tarihi</label>
                    <input type="date" id="mf-arrival" value="${mold.arrival_date || (isEdit ? '' : new Date().toISOString().split('T')[0])}">
                </div>
            </div>
            <div class="form-row" id="mf-kalip-fields">
                <div class="form-group">
                    <label>Üst / Alt</label>
                    <select id="mf-position">
                        <option value="Üst" ${mold.position === 'Üst' ? 'selected' : ''}>Üst</option>
                        <option value="Alt" ${mold.position === 'Alt' ? 'selected' : ''}>Alt</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Takım Var mı?</label>
                    <select id="mf-pair">
                        <option value="0" ${!mold.has_pair ? 'selected' : ''}>Hayır</option>
                        <option value="1" ${mold.has_pair ? 'selected' : ''}>Evet</option>
                    </select>
                </div>\r\n            </div>\r\n            <div class="form-row" id="mf-pair-fields" style="display:none">
                <div class="form-group">
                    <label id="mf-pair-label">Takım Kalıp Kodu * (sadece rakam)</label>
                    <input type="text" id="mf-pair-code" pattern="[0-9]*" inputmode="numeric" placeholder="Takım kalıbın kodu">
                </div>
                <div class="form-group">
                    <label>Takım Kalıp Pim Sayısı</label>
                    <input type="number" id="mf-pair-pin" value="0" min="0">
                </div>
            </div>
            <div class="form-group">
                <label>Notlar</label>
                <textarea id="mf-notes" rows="2">${mold.notes || ''}</textarea>
            </div>
        </form>`;

    const isAdmin = App.user.role === 'admin';
    const submitLabel = isEdit ? 'Güncelle' : (isAdmin ? 'Kaydet' : 'Onaya Gönder');
    const submitClass = isEdit ? 'btn-primary' : (isAdmin ? 'btn-primary' : 'btn-success');

    Modal.show(isEdit ? 'Kalıp Düzenle' : 'Yeni Kalıp Ekle', formHTML, `
        <button class="btn btn-secondary" onclick="Modal.hide()">İptal</button>
        <button class="btn ${submitClass}" id="mold-save-btn">
            <span class="material-icons-round">${isEdit ? 'save' : (isAdmin ? 'add' : 'send')}</span> ${submitLabel}
        </button>
    `);

    // Conditional fields logic
    const typeSelect = document.getElementById('mf-type');
    const pairSelect = document.getElementById('mf-pair');
    const positionSelect = document.getElementById('mf-position');

    function updateConditionalFields() {
        const type = typeSelect.value;
        const eyeRow = document.getElementById('mf-eye-row');
        const pinGroup = document.getElementById('mf-pin-group');
        const kalipFields = document.getElementById('mf-kalip-fields');
        const pairFields = document.getElementById('mf-pair-fields');

        // Eye count: Kalıp + Plaka only
        eyeRow.style.display = (type === 'Zımba') ? 'none' : 'grid';

        // Pin count: Kalıp only
        pinGroup.style.display = (type === 'Kalıp') ? 'block' : 'none';

        // Position + Pair: Kalıp only
        kalipFields.style.display = (type === 'Kalıp') ? 'grid' : 'none';

        // Pair mold fields: only when Kalıp + has_pair=1 + not editing
        const showPair = type === 'Kalıp' && pairSelect.value === '1' && !isEdit;
        pairFields.style.display = showPair ? 'grid' : 'none';

        // Update pair label based on position
        if (showPair) {
            const pos = positionSelect.value;
            const otherPos = pos === 'Üst' ? 'Alt' : 'Üst';
            document.getElementById('mf-pair-label').textContent = `${otherPos} Kalıp Kodu * (sadece rakam)`;
        }
    }
    typeSelect.addEventListener('change', updateConditionalFields);
    pairSelect.addEventListener('change', updateConditionalFields);
    positionSelect.addEventListener('change', updateConditionalFields);
    updateConditionalFields();

    // Save
    document.getElementById('mold-save-btn').addEventListener('click', async () => {
        const data = {
            product_code: document.getElementById('mf-product').value,
            mold_type: document.getElementById('mf-type').value,
            mold_code: document.getElementById('mf-code').value,
            eye_count: parseInt(document.getElementById('mf-eye').value) || 0,
            pin_count: parseInt(document.getElementById('mf-pin').value) || 0,
            status: document.getElementById('mf-status').value,
            machine_id: document.getElementById('mf-machine').value || null,
            position: document.getElementById('mf-position').value,
            has_pair: parseInt(document.getElementById('mf-pair').value),
            arrival_date: document.getElementById('mf-arrival').value || null,
            notes: document.getElementById('mf-notes').value || null,
        };

        // If pair, get pair mold code
        if (data.has_pair === 1 && data.mold_type === 'Kalıp' && !isEdit) {
            const pairCode = document.getElementById('mf-pair-code').value;
            if (!pairCode || !/^\d+$/.test(pairCode)) {
                showToast('Takım kalıp kodu zorunludur ve sadece rakamlardan oluşmalıdır.', 'error');
                return;
            }
            data.pair_mold_code = pairCode;
            data.pair_pin_count = parseInt(document.getElementById('mf-pair-pin').value) || 0;
        }

        // Uppercase product code
        data.product_code = data.product_code.toUpperCase();

        // Validate mold_code is numeric
        if (!/^\d+$/.test(data.mold_code)) {
            showToast('Kalıp kodu sadece rakamlardan oluşmalıdır.', 'error');
            return;
        }

        // Kalıp type requires Üst/Alt selection
        if (data.mold_type === 'Kalıp' && (!data.position || data.position === 'none')) {
            showToast('Kalıp türünde Üst veya Alt seçimi zorunludur.', 'error');
            return;
        }

        if (!data.product_code || !data.mold_type || !data.mold_code) {
            showToast('Ürün kodu, kalıp türü ve kalıp kodu zorunludur.', 'error');
            return;
        }

        try {
            if (isEdit) {
                await API.put(`/api/molds/${id}`, data);
                showToast('Kalıp güncellendi.', 'success');
            } else if (isAdmin) {
                await API.post('/api/pending', data);
                showToast('Kalıp eklendi.', 'success');
            } else {
                await API.post('/api/pending', data);
                showToast('Kalıp onay için gönderildi.', 'info');
            }
            Modal.hide();
            loadMolds();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });
}

function deleteMold(id, code) {
    Modal.confirm('Kalıp Sil', `<strong>${code}</strong> kodlu kalıbı silmek istediğinize emin misiniz?`, async () => {
        try {
            await API.delete(`/api/molds/${id}`);
            showToast('Kalıp silindi.', 'success');
            loadMolds();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });
}
