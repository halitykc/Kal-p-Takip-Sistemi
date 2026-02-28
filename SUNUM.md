# Kalıp Takip Sistemi - Proje Sunumu 🏭

Bu belge, **Kalıp Takip Sistemi** projesinin genel mimarisini, amacını, özelliklerini ve çalışma mantığını teknik ve kullanıcı düzeyinde açıklamak için hazırlanmıştır.

---

## 1. Proje Özeti ve Amacı
Kalıp Takip Sistemi, endüstriyel üretim yapan fabrikalarda kullanılan kalıpların (Üst Kalıp, Alt Kalıp, Zımba, Plaka vb.) yaşam döngüsünü, stok durumlarını, lokasyonlarını ve arıza/bakım süreçlerini dijital ortamda izlemek için geliştirilmiş **web tabanlı** bir yönetim otomasyonudur.

Temel amacı; Excel veya kağıt üzerinde tutulan dağınık verileri merkezi bir veritabanında toplayarak veri kaybını önlemek, süreçleri hızlandırmak ve anlık raporlama yapabilmektir.

---

## 2. Kullanılan Teknolojiler (Tech Stack)
Proje, hafif, kurulumu kolay ve hızlı çalışacak şekilde tasarlanmıştır. Dış bir veritabanı sunucusuna ihtiyaç duymadan kendi içinde çalışabilir.

*   **Frontend (Önyüz):** HTML5, CSS3, Vanilla JavaScript (Framework kullanılmamıştır, SPA - Single Page Application mimarisi ile çalışır).
*   **Backend (Arkayüz):** Node.js, Express.js (RESTful API mimarisi).
*   **Veritabanı:** SQLite (Veriler yerel olarak `data/kalip.db` dosyasında tutulur, `sql.js` kütüphanesi ile yönetilir).
*   **Güvenlik:** `bcryptjs` (Şifre hashleme), `express-session` (Oturum yönetimi).
*   **Diğer Araçlar:** `xlsx` (Excel'e dışa ve içe aktarım), `multer` (Dosya yükleme işlemleri).

---

## 3. Temel Özellikler Modülleri

### 👤 Yetkilendirme (Rol Bazlı Sistem)
*   **Sistem Yöneticisi (Admin):** Tam yetkiye sahiptir. Kalıp ekleyebilir, silebilir, onay süreçlerini yönetebilir, kullanıcıları silebilir ve yedekleme alabilir.
*   **Operatör:** Sınırlı yetkiye sahiptir. Sadece stok hareketlerini görebilir, bakım kaydı oluşturabilir ve sisteme yeni kalıp eklenmesi için "Onay Talebi" gönderebilir.

### 📦 Kalıp ve Stok Yönetimi
*   Kalıplar; Tür (Kalıp, Zımba, Plaka), Pozisyon (Üst, Alt) ve Durum (Stokta, Makinede, Bakımda, Hurda vb.) bazında detaylıca sisteme işlenir.
*   **Takım Kalıp Mantığı:** Alt ve Üst kalıplar birbirine bağlanarak "Takım" haline getirilebilir.
*   Her kalıbın hangi makinede çalıştığı ve raf pozisyonu takip edilebilir.

### 🛠️ Bakım ve Arıza Takibi
*   Kalıpların periyodik bakımları veya anlık arızaları sisteme işlenir.
*   Bakım türleri: *Periyodik Bakım, Arıza, Revizyon, Kontrol.*
*   Kalıp bakıma alındığında, stok durumu otomatik olarak **"Bakımda"** veya **"Arızalı"** olarak güncellenir.
*   Yaklaşan bakımlar (sonraki bakım tarihine yaklaşıldığında) sistem tarafından kırmızı renkle vurgulanarak haber verilir.

### 🔔 Bildirim & Audit Log (İzlenebilirlik)
*   **Bildirimler:** Operatörler yeni bir kalıp talebi gönderdiğinde veya bir bakım tamamlandığında yöneticilere anlık uygulama içi bildirim (can simidi ikonu) düşer.
*   **Audit Log (Geçmiş):** Sistemdeki her kritik işlem (Kalıp eklendi, güncellendi, silindi) arka planda kaydedilir. Kimin, ne zaman, hangi veriyi değiştirdiği izlenebilir.

### 💾 Yedekleme (Backup) ve Excel Entegrasyonu
*   Sistem veritabanının yedeği anlık olarak tek tuşla alınabilir, indirilebilir ve gerektiğinde geri yüklenebilir.
*   Tüm raporlar (Kalıp Listesi, Stok Hareketleri, Bakım Kayıtları) tek tuşla **.xlsx (Excel)** formatında bilgisayara indirilebilir.

---

## 4. Uygulamanın Çalışma Alt Yapısı

1.  **SPA (Single Page Application) Mimarisi:** Frontend `js/app.js` üzerinden yönetilir. Sayfalar arası geçişlerde sayfa yenilenmez (reload olmaz), sadece ilgili `div` içerisine yeni modülün HTML/JS'i yüklenir. Bu sayede uygulama bir masaüstü programı gibi çok hızlı tepki verir.
2.  **API İletişimi:** Frontend, sunucudaki backend ile `/api/...` rotaları üzerinden JSON formatında haberleşir (bkz. `public/js/api.js`).
3.  **Başlatma (Launch):** Kullanıcı dostu olması için `BAŞLAT.bat` ve `Baslat.vbs` dosyaları hazırlanmıştır. Bu dosyalar arka planda Node.js sunucusunu ayağa kaldırır ve varsayılan tarayıcıda `http://localhost:3000` adresini otomatik olarak açar. Siyah CMD ekranı arka planda gizli çalışır.

---

## 5. Kurulum ve Çalıştırma

1.  Bilgisayarda **Node.js** yüklü olmalıdır.
2.  Proje klasörüne girip bağımlılıkları yüklemek için kalasör dizininde terminale şunu yazın:
    \`\`\`bash
    npm install
    \`\`\`
3.  Sistemi başlatmak için klasör içindeki **`BAŞLAT.bat`** dosyasına çift tıklamanız yeterlidir.
4.  Eğer tarayıcı açılmazsa manuel olarak `http://localhost:3000` adresine gidebilirsiniz.
5.  **Varsayılan Kullanıcılar:**
    *   Yönetici: `admin` / Şifre: `admin123`
    *   Operatör: `operator` / Şifre: `operator123`

---
*Bu sistem Endüstri Mühendisi Halit Yakıcı tarafından modern üretim takip ihtiyaçlarına özel olarak tasarlanıp geliştirilmiştir.*
