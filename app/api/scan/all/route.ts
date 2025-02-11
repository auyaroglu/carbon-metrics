import { NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Url from "@/models/Url"
import Metric from "@/models/Metric"
import Job from "@/models/Job"

const API_KEY = process.env.PAGESPEED_API_KEY
const DELAY_BETWEEN_REQUESTS = 2000 // 2 saniye bekle

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runPageSpeedTest(url: string) {
  try {
    console.log('Tarama başlatılıyor:', url)
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&category=performance&key=${API_KEY}`
    
    console.log('PageSpeed API isteği gönderiliyor:', apiUrl)
    const response = await fetch(apiUrl)
    const data = await response.json()

    if (!response.ok) {
      console.error('PageSpeed API hatası:', data)
      throw new Error(data.error?.message || "PageSpeed API isteği başarısız oldu")
    }

    console.log('PageSpeed API yanıtı alındı:', JSON.stringify(data, null, 2))

    if (!data.lighthouseResult) {
      throw new Error("Lighthouse sonuçları alınamadı")
    }

    const audits = data.lighthouseResult.audits
    const metrics = {
      cls: audits['cumulative-layout-shift']?.numericValue || 0,
      lcp: audits['largest-contentful-paint']?.numericValue || 0,
      inp: audits['interaction-to-next-paint']?.numericValue || audits['interactive']?.numericValue || 0,
      timestamp: new Date()
    }

    console.log('Hesaplanan metrikler:', metrics)
    return metrics
  } catch (error) {
    console.error('PageSpeed testi çalıştırma hatası:', error)
    throw error
  }
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'cancel') {
    global.isScanningCancelled = true;
    // Tüm işleyen jobları iptal et
    await Job.updateMany(
      { status: 'processing' },
      { status: 'failed', error: 'Kullanıcı tarafından iptal edildi' }
    );
    return NextResponse.json({ message: "Tarama işlemi iptal edildi" });
  }

  try {
    await connectDB()
    
    // Önce tüm URL'leri al
    const urls = await Url.find().lean()
    const totalUrls = urls.length
    console.log(`${totalUrls} adet URL bulundu`)

    // Aktif job'ları temizle
    await Job.deleteMany({ 
      status: { $in: ['pending', 'processing'] }
    });

    // Her URL için bir job oluştur
    const jobs = await Promise.all(
      urls.map(url => Job.create({ urlId: url._id }))
    )
    console.log(`${jobs.length} adet job oluşturuldu`)

    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();

    // İlk mesajı gönder
    const initialMessage = { type: 'start', total: urls.length };
    await writer.write(encoder.encode(`data: ${JSON.stringify(initialMessage)}\n\n`));

    // URL'leri sırayla tara
    let scannedCount = 0;
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const job = jobs[i];

      // İptal kontrolü
      if (global.isScanningCancelled) {
        const cancelMessage = { type: 'cancelled', scanned: scannedCount, total: urls.length };
        await writer.write(encoder.encode(`data: ${JSON.stringify(cancelMessage)}\n\n`));
        await writer.close();
        return new Response(stream.readable, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        });
      }

      try {
        // Job'ı işleme alındı olarak işaretle
        job.status = 'processing';
        job.startedAt = new Date();
        await job.save();
        
        console.log(`${url.url} taranıyor...`)
        
        // PageSpeed API ile tarama yap
        const metrics = await runPageSpeedTest(url.url)

        // Metrikleri kaydet
        const savedMetric = await Metric.create({
          urlId: url._id,
          cls: metrics.cls,
          lcp: metrics.lcp,
          inp: metrics.inp,
          timestamp: metrics.timestamp
        })

        console.log('Metrikler kaydedildi:', savedMetric)

        // URL'nin son tarama tarihini güncelle
        await Url.findByIdAndUpdate(
          url._id,
          { lastScanned: metrics.timestamp },
          { new: true }
        )

        // Job'ı tamamlandı olarak işaretle
        job.status = 'completed';
        job.completedAt = new Date();
        await job.save();

        scannedCount++;

        // İlerleme durumunu gönder
        const progressMessage = { 
          type: 'progress', 
          scanned: scannedCount, 
          total: urls.length,
          currentUrl: url.url,
          remainingJobs: urls.length - scannedCount
        };
        await writer.write(encoder.encode(`data: ${JSON.stringify(progressMessage)}\n\n`));

        // API limitlerini aşmamak için bekle
        await sleep(DELAY_BETWEEN_REQUESTS)
      } catch (error) {
        console.error(`${url.url} taranırken hata:`, error)
        
        // Job'ı hatalı olarak işaretle
        job.status = 'failed';
        job.error = error instanceof Error ? error.message : "Tarama hatası";
        await job.save();

        // Hata durumunu gönder
        const errorMessage = { 
          type: 'error', 
          url: url.url, 
          error: error instanceof Error ? error.message : "Tarama hatası"
        };
        await writer.write(encoder.encode(`data: ${JSON.stringify(errorMessage)}\n\n`));
      }
    }

    // Tamamlanma mesajını gönder
    const completeMessage = { 
      type: 'complete', 
      scanned: scannedCount, 
      total: urls.length,
      remainingJobs: 0
    };
    await writer.write(encoder.encode(`data: ${JSON.stringify(completeMessage)}\n\n`));
    await writer.close();

    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error("Toplu tarama sırasında hata:", error)
    return NextResponse.json(
      { error: "Toplu tarama sırasında bir hata oluştu" },
      { status: 500 }
    )
  }
} 