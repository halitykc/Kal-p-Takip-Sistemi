// Users Page
async function renderUsers() {
    const content = document.getElementById('page-content');

    const topbarActions = document.getElementById('topbar-actions');
    topbarActions.innerHTML = `
        <button class="btn btn-primary" id="add-user-btn">
            <span class="material-icons-round">person_add</span> Yeni Kullanıcı
        </button>`;
    document.getElementById('add-user-btn').addEventListener('click', () => showUserForm());

    content.innerHTML = `
        <div class="section">
            <div class="section-body" style="padding:0" id="users-table">
                <div class="spinner"></div>
            </div>
        </div>`;

    loadUsers();
}

async function loadUsers() {
    const container = document.getElementById('users-table');
    const roleLabels = { admin: 'Yönetici', operator: 'Operatör', viewer: 'İzleyici' };
    const roleBadges = { admin: 'badge-danger', operator: 'badge-warning', viewer: 'badge-neutral' };

    try {
        const users = await API.get('/api/users');
        container.innerHTML = renderTable([
            { label: 'Kullanıcı Adı', render: r => `<strong>${r.username}</strong>` },
            { label: 'Ad Soyad', key: 'full_name' },
            { label: 'Rol', render: r => `<span class="badge ${roleBadges[r.role]}">${roleLabels[r.role]}</span>` },
            { label: 'Oluşturulma', render: r => formatDate(r.created_at) },
            {
                label: 'İşlem', render: r => `
                <div class="action-btns">
                    <button class="action-btn edit" onclick="showUserForm(${r.id})" title="Düzenle">
                        <span class="material-icons-round">edit</span>
                    </button>
                    ${r.id !== App.user.id ? `
                    <button class="action-btn delete" onclick="deleteUser(${r.id}, '${r.username}')" title="Sil">
                        <span class="material-icons-round">delete</span>
                    </button>` : ''}
                </div>` }
        ], users, { emptyIcon: 'group', emptyTitle: 'Kullanıcı bulunamadı' });
    } catch (err) {
        container.innerHTML = `<div class="error-msg">${err.message}</div>`;
    }
}

async function showUserForm(id = null) {
    const isEdit = id !== null;
    let user = {};

    if (isEdit) {
        try {
            const users = await API.get('/api/users');
            user = users.find(u => u.id === id) || {};
        } catch (err) { showToast(err.message, 'error'); return; }
    }

    Modal.show(isEdit ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı', `
        <form id="user-form">
            <div class="form-group">
                <label>Kullanıcı Adı *</label>
                <input type="text" id="uf-username" value="${user.username || ''}" required>
            </div>
            <div class="form-group">
                <label>${isEdit ? 'Yeni Şifre (boş bırakırsa değişmez)' : 'Şifre *'}</label>
                <input type="password" id="uf-password" ${isEdit ? '' : 'required'} placeholder="${isEdit ? 'Değiştirmek için yazın...' : 'Şifre'}">
            </div>
            <div class="form-group">
                <label>Ad Soyad *</label>
                <input type="text" id="uf-fullname" value="${user.full_name || ''}" required>
            </div>
            <div class="form-group">
                <label>Rol</label>
                <select id="uf-role">
                    <option value="viewer" ${user.role === 'viewer' ? 'selected' : ''}>İzleyici</option>
                    <option value="operator" ${user.role === 'operator' ? 'selected' : ''}>Operatör</option>
                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Yönetici</option>
                </select>
            </div>
        </form>
    `, `
        <button class="btn btn-secondary" onclick="Modal.hide()">İptal</button>
        <button class="btn btn-primary" id="user-save-btn">
            <span class="material-icons-round">save</span> Kaydet
        </button>
    `);

    document.getElementById('user-save-btn').addEventListener('click', async () => {
        const data = {
            username: document.getElementById('uf-username').value,
            password: document.getElementById('uf-password').value || undefined,
            full_name: document.getElementById('uf-fullname').value,
            role: document.getElementById('uf-role').value,
        };
        if (!data.username || !data.full_name) { showToast('Kullanıcı adı ve ad soyad zorunludur.', 'error'); return; }
        if (!isEdit && !data.password) { showToast('Şifre zorunludur.', 'error'); return; }

        try {
            if (isEdit) await API.put(`/api/users/${id}`, data);
            else await API.post('/api/users', data);
            showToast(isEdit ? 'Kullanıcı güncellendi.' : 'Kullanıcı oluşturuldu.', 'success');
            Modal.hide();
            loadUsers();
        } catch (err) { showToast(err.message, 'error'); }
    });
}

function deleteUser(id, username) {
    Modal.confirm('Kullanıcı Sil', `<strong>${username}</strong> kullanıcısını silmek istediğinize emin misiniz?`, async () => {
        try {
            await API.delete(`/api/users/${id}`);
            showToast('Kullanıcı silindi.', 'success');
            loadUsers();
        } catch (err) { showToast(err.message, 'error'); }
    });
}
