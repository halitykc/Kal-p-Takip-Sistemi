// Backup Management Page
async function renderBackup() {
    const content = document.getElementById('page-content');

    const topbarActions = document.getElementById('topbar-actions');
    topbarActions.innerHTML = `
        <button class="btn btn-primary" id="create-backup-btn">
            <span class="material-icons-round">backup</span> Yedek Oluştur
        </button>`;
    document.getElementById('create-backup-btn').addEventListener('click', createBackup);

    content.innerHTML = `
        <div class="section">
            <div class="section-header">
                <div class="section-title">
                    <span class="material-icons-round">backup</span>
                    Veritabanı Yedekleri
                </div>
            </div>
            <div class="section-body" style="padding:0" id="backup-table">
                <div class="spinner"></div>
            </div>
        </div>
        <div class="section">
            <div class="section-header">
                <div class="section-title">
                    <span class="material-icons-round">info</span>
                    Yedekleme Bilgisi
                </div>
            </div>
            <div class="section-body">
                <p class="text-muted">Veritabanı yedekleri <code>data/backups/</code> klasöründe saklanır.</p>
                <p class="text-muted">Düzenli yedekleme yapmanız veri kaybını önler.</p>
            </div>
        </div>`;

    loadBackups();
}

async function loadBackups() {
    const container = document.getElementById('backup-table');
    try {
        const backups = await API.get('/api/backup/list');
        container.innerHTML = renderTable([
            { label: 'Dosya Adı', render: r => `<strong class="font-mono">${r.filename}</strong>` },
            { label: 'Boyut', render: r => formatFileSize(r.size) },
            { label: 'Tarih', render: r => formatDate(r.date) },
            {
                label: 'İşlem', render: r => `
                <div class="action-btns">
                    <button class="btn btn-success btn-sm" onclick="downloadBackup('${r.filename}')" title="İndir">
                        <span class="material-icons-round">download</span>
                    </button>
                    <button class="action-btn delete" onclick="deleteBackup('${r.filename}')" title="Sil">
                        <span class="material-icons-round">delete</span>
                    </button>
                </div>` }
        ], backups, { emptyIcon: 'backup', emptyTitle: 'Henüz yedek oluşturulmamış', emptyText: 'İlk yedeğinizi oluşturmak için "Yedek Oluştur" butonuna tıklayın.' });
    } catch (err) {
        container.innerHTML = `<div class="error-msg">${err.message}</div>`;
    }
}

async function createBackup() {
    try {
        const result = await API.post('/api/backup/create');
        showToast(result.message, 'success');
        loadBackups();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function downloadBackup(filename) {
    window.open(`/api/backup/download/${filename}`, '_blank');
}

function deleteBackup(filename) {
    Modal.confirm('Yedeği Sil', `<strong>${filename}</strong> yedek dosyasını silmek istediğinize emin misiniz?`, async () => {
        try {
            await API.delete(`/api/backup/${filename}`);
            showToast('Yedek silindi.', 'success');
            loadBackups();
        } catch (err) { showToast(err.message, 'error'); }
    });
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
