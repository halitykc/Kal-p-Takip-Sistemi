// Excel Import Page
function renderImport() {
    const content = document.getElementById('page-content');

    content.innerHTML = `
        <div class="section">
            <div class="section-header">
                <div class="section-title">
                    <span class="material-icons-round">upload_file</span>
                    Excel Dosyasından Veri Aktarma
                </div>
            </div>
            <div class="section-body">
                <div class="upload-zone" id="upload-zone">
                    <span class="material-icons-round">cloud_upload</span>
                    <h3>Excel Dosyanızı Sürükleyin veya Tıklayın</h3>
                    <p>Desteklenen formatlar: .xlsx, .xls, .csv (Max 10MB)</p>
                    <input type="file" id="excel-file" accept=".xlsx,.xls,.csv" style="display:none">
                </div>
                <div id="import-result" style="display:none"></div>
            </div>
        </div>

        <div class="section">
            <div class="section-header">
                <div class="section-title">
                    <span class="material-icons-round">info</span>
                    Excel Format Bilgisi
                </div>
            </div>
            <div class="section-body">
                <p class="text-muted mb-16">Excel dosyanızda aşağıdaki sütun başlıkları aranır:</p>
                <div class="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Sütun Başlığı</th>
                                <th>Açıklama</th>
                                <th>Zorunlu</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td><strong>Ürün Kodu</strong></td><td>Ürünün kodu</td><td><span class="badge badge-danger">Evet</span></td></tr>
                            <tr><td><strong>Kalıp Türü</strong></td><td>Kalıp, Zımba veya Plaka</td><td><span class="badge badge-neutral">Hayır</span></td></tr>
                            <tr><td><strong>Kalıp Kodu</strong></td><td>Kalıbın benzersiz kodu</td><td><span class="badge badge-neutral">Hayır</span></td></tr>
                            <tr><td><strong>Göz Sayısı</strong></td><td>Göz sayısı (sadece Kalıp ve Plaka)</td><td><span class="badge badge-neutral">Hayır</span></td></tr>
                            <tr><td><strong>Pim Sayısı</strong></td><td>Pim sayısı (sadece Kalıp)</td><td><span class="badge badge-neutral">Hayır</span></td></tr>
                            <tr><td><strong>Durumu</strong></td><td>Yeni, Stokta, Çıkış, vb.</td><td><span class="badge badge-neutral">Hayır</span></td></tr>
                            <tr><td><strong>Makinası</strong></td><td>Atanmış makina adı</td><td><span class="badge badge-neutral">Hayır</span></td></tr>
                            <tr><td><strong>Üst mü? Alt mı kalıp?</strong></td><td>ÜST veya ALT (sadece Kalıp)</td><td><span class="badge badge-neutral">Hayır</span></td></tr>
                            <tr><td><strong>takım olarak var mı?</strong></td><td>EVET veya HAYIR</td><td><span class="badge badge-neutral">Hayır</span></td></tr>
                            <tr><td><strong>Geliş Tarihi</strong></td><td>gg.aa.yyyy formatında</td><td><span class="badge badge-neutral">Hayır</span></td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>`;

    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('excel-file');

    uploadZone.addEventListener('click', () => fileInput.click());

    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = 'var(--accent)';
        uploadZone.style.background = 'var(--accent-glow)';
    });

    uploadZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = '';
        uploadZone.style.background = '';
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = '';
        uploadZone.style.background = '';
        if (e.dataTransfer.files.length > 0) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            handleFileUpload(fileInput.files[0]);
        }
    });
}

async function handleFileUpload(file) {
    const resultDiv = document.getElementById('import-result');
    const uploadZone = document.getElementById('upload-zone');

    uploadZone.innerHTML = `
        <div class="spinner"></div>
        <h3>Dosya işleniyor...</h3>
        <p>${file.name}</p>
    `;

    const formData = new FormData();
    formData.append('file', file);

    try {
        const result = await API.upload('/api/import/excel', formData);
        resultDiv.style.display = 'block';
        resultDiv.className = 'import-result success';
        resultDiv.innerHTML = `
            <h3 style="color: var(--success); margin-bottom: 12px;">
                <span class="material-icons-round" style="vertical-align:middle">check_circle</span>
                Import Tamamlandı!
            </h3>
            <p><strong>${result.imported}</strong> kayıt başarıyla eklendi.</p>
            <p><strong>${result.skipped}</strong> kayıt atlandı (tekrar veya hata).</p>
            <p>Toplam: ${result.total} satır işlendi.</p>
            ${result.errors && result.errors.length > 0 ? `
                <div class="mt-16">
                    <p><strong>Hatalar:</strong></p>
                    <ul style="color: var(--steel-400); font-size: 12px; padding-left: 20px;">
                        ${result.errors.map(e => `<li>${e}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
        `;

        uploadZone.innerHTML = `
            <span class="material-icons-round">cloud_upload</span>
            <h3>Başka bir dosya yüklemek için tıklayın</h3>
            <p>Desteklenen formatlar: .xlsx, .xls, .csv</p>
        `;

        showToast(`${result.imported} kalıp başarıyla aktarıldı!`, 'success');
    } catch (err) {
        resultDiv.style.display = 'block';
        resultDiv.className = 'import-result error';
        resultDiv.innerHTML = `
            <h3 style="color: var(--danger);">
                <span class="material-icons-round" style="vertical-align:middle">error</span>
                Import Hatası
            </h3>
            <p>${err.message}</p>
        `;

        uploadZone.innerHTML = `
            <span class="material-icons-round">cloud_upload</span>
            <h3>Tekrar deneyin</h3>
            <p>Desteklenen formatlar: .xlsx, .xls, .csv</p>
        `;

        showToast(err.message, 'error');
    }
}
