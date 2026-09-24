# OdaMatik — PHP + MySQL Sürümü

Akıllı Oda Yerleşim ve Misafir Yönetim Sistemi. Orijinal tek dosyalık HTML (localStorage)
uygulaması **PHP + MySQL veritabanı** ile ekle / sil / güncelle destekli hale getirildi.

## Dosyalar

| Dosya | Görevi |
|-------|--------|
| `index.php` | Ana arayüz (Tailwind + FontAwesome, orijinal tasarım korundu) |
| `app.js` | Frontend mantığı — tüm işlemler `fetch` ile `api.php`'ye gider |
| `api.php` | JSON API — ekle/sil/güncelle/ata/otomatik yerleştir işlemleri |
| `db.php` | PDO bağlantısı; veritabanı + tabloları **otomatik oluşturur**, boşsa örnek veriyi yükler |
| `config.php` | Veritabanı bağlantı bilgileri (burayı düzenleyin) |
| `seed_data.php` | Görseldeki 50 oda + bekleme listesi başlangıç verisi |
| `schema.sql` | Tabloların referans SQL şeması (elle kurulum için) |

## Kurulum

1. **Dosyaları** web sunucunuza kopyalayın (XAMPP → `htdocs/odamatik`, veya hosting `public_html`).
2. **`config.php`** içindeki MySQL bilgilerini kendi ayarlarınıza göre düzenleyin:
   ```php
   define('DB_HOST', '127.0.0.1');
   define('DB_NAME', 'odamatik');
   define('DB_USER', 'root');
   define('DB_PASS', '');   // kendi şifreniz
   ```
3. Tarayıcıda **`index.php`** adresini açın:
   `http://localhost/odamatik/index.php`

İlk açılışta veritabanı, tablolar ve örnek veriler **otomatik** oluşturulur.
(MySQL kullanıcısının `CREATE DATABASE` yetkisi yoksa, `schema.sql`'i phpMyAdmin'de bir kez çalıştırın.)

## Özellikler (Ekle / Sil / Güncelle)

- **Oda Ekle** — "Oda Ekle" düğmesi → yeni oda veritabanına kaydedilir.
- **Modalda Oda Güncelleme** — bir odaya tıklayın; harf ve rakam içerebilen oda adı/numarası, yatak sayısı, blok ve rampa bilgisi geniş düzenleme penceresinde açılır.
- **Modalda Misafir Güncelleme** — ad soyad, TC kimlik no, telefon, A‑1/A‑2/A‑3 geliş otobüsü ve kısa sağlık/genel notu aynı düzenleme penceresinde eklenir, değiştirilir veya silinir.
- **Çok Biçimli Rapor** — tüm biçimlerde (Excel, Word, PDF, JPG) yalnızca **sıra no, TC, ad soyad, telefon no ve geldiği otobüs** sütunlarını listeler; PDF ve Word çıktıları misafirleri geliş otobüsüne göre (A‑1/A‑2/A‑3) gruplandırır.
- **Oda Sil** — seçili oda kartındaki "Odayı Sil" ile kalıcı olarak silinir (misafirleri de otomatik silinir).
- **Aile/Grup Ekle** — bekleme listesine ekler, isteğe bağlı otomatik yerleştirir.
- **Excel'den Misafir Yükleme** — başlıktaki **Excel Yükle** düğmesiyle `.xlsx`/`.xls`/`.csv` bir misafir listesi seçilir; sütunlar otomatik algılanır (Ad Soyad, TC, Telefon ve isteğe bağlı Otobüs) ve onaydan sonra her satır **bekleme listesine** kaydedilir. Başlık satırı yoksa sütunlar sıraya göre alınır; "Ad" ve "Soyad" ayrı sütunlarsa otomatik birleştirilir. "Hemen yerleştirmeyi dene" seçilirse boş oda bulunan misafirler odalarına yerleştirilir.
- **Bekleme Listesinden Sil** — çöp kutusu simgesi.
- **Odaya Ata / Boşalt** — bekleme listesinden odaya atama, odayı boşaltma.
- **Akıllı Yerleştir** — bekleyen tüm aileleri en uygun (Best-Fit + rampa öncelikli) odalara sunucuda yerleştirir.
- **Personel Odası** — bir odayı personel odasına çevir / geri al.
- **Odaları Boşalt / Fabrika Ayarları** — toplu boşaltma ve orijinal şablonu geri yükleme.

## Teknik Notlar

- Bağlantı **PDO** ile kurulur, tüm sorgular **prepared statement** (SQL injection'a karşı güvenli).
- Karakter seti `utf8mb4_turkish_ci` — Türkçe karakterler (İ, ş, ğ, ç...) doğru saklanır.
- API her işlemden sonra güncel tüm durumu döndürür; arayüz tek noktadan yeniden çizilir.
- Oda ve misafir değişiklikleri `save_room` işlemiyle tek veritabanı transaction'ı içinde kaydedilir.
- Misafir modelindeki `notes` alanı (veritabanında `room_guests.note`) en fazla 255 karakterlik sağlık durumu veya genel açıklama saklar.
- Misafir telefonları `phone` alanında saklanır; mevcut veritabanlarına sütun otomatik olarak eklenir.
- Bekleme listesindeki misafirlerin de TC/telefon/otobüs bilgisi `waiting_members` tablosunda saklanır (`tc`, `phone`, `bus_code`); mevcut veritabanlarına bu sütunlar otomatik olarak eklenir. Böylece Excel'den yüklenen bilgiler odaya yerleşince raporlarda kaybolmaz.
- Dışa aktarma kitaplıkları yalnızca ihtiyaç anında yüklenir: SheetJS (Excel), docx (Word), html2canvas (JPG/PDF) ve jsPDF (PDF).
- Tablolar: `rooms`, `room_guests`, `waiting_list`, `waiting_members` (foreign key + ON DELETE CASCADE).
