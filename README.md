# Carbon Metrics

Web sitelerinin Core Web Vitals metriklerini otomatik olarak toplayan ve raporlayan bir uygulama.

## Özellikler

- URL'lerin otomatik taranması
- Core Web Vitals metriklerinin toplanması (CLS, LCP, INP)
- Haftalık otomatik tarama planı
- Metrik geçmişi ve trend analizi
- Mobil uyumlu arayüz

## Teknolojiler

- Next.js 15 (App Router)
- MongoDB
- TypeScript
- Tailwind CSS
- shadcn/ui
- PageSpeed Insights API

## Kurulum

1. Repoyu klonlayın:
```bash
git clone https://github.com/user/carbon-metrics.git
cd carbon-metrics
```

2. Bağımlılıkları yükleyin:
```bash
npm install
```

3. `.env` dosyasını oluşturun:
```env
MONGODB_URI=your_mongodb_uri
PAGESPEED_API_KEY=your_pagespeed_api_key
CRON_SECRET_KEY=your_cron_secret_key
```

4. Geliştirme sunucusunu başlatın:
```bash
npm run dev
```

## Cron Jobs

Projede iki adet otomatik çalışan job bulunmaktadır:

### 1. Haftalık URL Tarama Planı
- **Zamanlama**: Her Pazar günü gece yarısı (00:00)
- **Cron İfadesi**: `0 0 * * 0`
- **Görevi**: Sistemdeki tüm URL'ler için yeni tarama işleri oluşturur
- **Dosya**: `lib/cron.ts > handleWeeklyJob`

### 2. Periyodik Tarama İşlemi
- **Zamanlama**: Her 5 dakikada bir
- **Cron İfadesi**: `*/5 * * * *`
- **Görevi**: 
  - Bekleyen işleri (pending jobs) kontrol eder
  - Her çalışmada en fazla 5 URL'yi tarar
  - PageSpeed API kullanarak metrikleri toplar
  - Sonuçları veritabanına kaydeder
- **Dosya**: `lib/cron.ts > handleScanJob`

### Cron Yönetimi

Cron'ları başlatmak için aşağıdaki URL'lerden birini ziyaret edin:

1. Tarayıcıdan:
```
https://your-domain.com/api/cron/start?key=your_cron_secret_key
```

2. Terminal'den:
```bash
curl "https://your-domain.com/api/cron/start?key=your_cron_secret_key"
```

3. Uptime monitoring servisleri ile:
- UptimeRobot, Pingdom gibi servislere yukarıdaki URL'i ekleyerek düzenli kontrol sağlayabilirsiniz
- Monitoring aralığını 5 dakika olarak ayarlayın

Not: Cron'lar başlatıldıktan sonra:
- Her Pazar gece yarısı tüm URL'ler için job oluşturulur
- Her 5 dakikada bir bekleyen job'lar işlenir
- Loglar console'da görüntülenir

## Veritabanı Şeması

### URL Koleksiyonu
- `_id`: ObjectId
- `url`: String
- `lastScanned`: Date
- `createdAt`: Date

### Job Koleksiyonu
- `_id`: ObjectId
- `urlId`: ObjectId (URL referansı)
- `status`: String (pending/processing/failed)
- `error`: String
- `createdAt`: Date

### Metric Koleksiyonu
- `_id`: ObjectId
- `urlId`: ObjectId (URL referansı)
- `cls`: Number
- `lcp`: Number
- `inp`: Number
- `timestamp`: Date

## API Endpoints

### URL Yönetimi
- `GET /api/urls`: URL listesi
- `POST /api/urls`: Yeni URL ekle
- `DELETE /api/urls`: URL sil

### Tarama İşlemleri
- `POST /api/scan`: Seçili URL'leri tara
- `GET /api/jobs/status`: Job durumlarını kontrol et
- `DELETE /api/jobs`: Tüm jobları temizle

### Metrik Yönetimi
- `GET /api/metrics`: Metrik listesi
- `DELETE /api/metrics/clear`: Tüm metrikleri temizle

### Cron İşlemleri
- `POST /api/cron/start`: Cron'ları başlat
- `GET /api/cron/weekly`: Haftalık job tetikleyici
- `GET /api/cron/scan`: 5 dakikalık job tetikleyici

## Güvenlik

- Tüm cron endpoint'leri `CRON_SECRET_KEY` ile korunmaktadır
- API istekleri rate limiting ile sınırlandırılmıştır
- MongoDB bağlantısı SSL ile şifrelenmiştir

## Katkıda Bulunma

1. Fork'layın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi commit edin (`git commit -m 'feat: amazing feature'`)
4. Branch'inizi push edin (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun 