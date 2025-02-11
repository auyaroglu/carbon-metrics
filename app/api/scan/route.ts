import { NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Url from "@/models/Url"
import Job from "@/models/Job"

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const API_KEY = process.env.PAGESPEED_API_KEY

async function runPageSpeedTest(url: string) {
  try {
    console.log('Tarama başlatılıyor:', url)

    // API URL'ini oluştur - mobil görünüm ve performans kategorisi için
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&category=performance&key=${API_KEY}`
    console.log('API URL:', apiUrl)

    const response = await fetch(apiUrl)
    const data = await response.json()

    if (!response.ok) {
      console.error('API Hatası:', data)
      throw new Error(data.error?.message || "PageSpeed API isteği başarısız oldu")
    }

    console.log('API Yanıtı:', JSON.stringify(data, null, 2))

    if (!data.lighthouseResult) {
      throw new Error("Lighthouse sonuçları alınamadı")
    }

    // Lighthouse sonuçlarından metrikleri al
    const audits = data.lighthouseResult.audits
    const metrics = {
      // CLS (Cumulative Layout Shift)
      cls: audits['cumulative-layout-shift']?.numericValue || 0,
      
      // LCP (Largest Contentful Paint)
      lcp: audits['largest-contentful-paint']?.numericValue || 0,
      
      // INP (Interaction to Next Paint) - Eğer mevcut değilse TTI (Time to Interactive) kullan
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
  try {
    await connectDB()

    const body = await request.json()
    console.log('Gelen istek:', body)

    const urlIds = Array.isArray(body.urls) ? body.urls : [body.urlId]

    if (!urlIds || urlIds.length === 0) {
      return NextResponse.json(
        { error: "Geçerli URL gereklidir" },
        { status: 400 }
      )
    }

    // Aktif job'ları temizle
    await Job.deleteMany({ 
      urlId: { $in: urlIds },
      status: { $in: ['pending', 'processing'] }
    });

    // Her URL için bir job oluştur
    const jobs = await Promise.all(
      urlIds.map((urlId: string) => Job.create({ urlId }))
    )
    console.log(`${jobs.length} adet job oluşturuldu`)

    return NextResponse.json({
      message: "Tarama işlemi başlatıldı",
      jobs: jobs.map(job => ({
        id: job._id,
        urlId: job.urlId,
        status: job.status
      }))
    });
  } catch (error) {
    console.error("Tarama sırasında hata oluştu:", error)
    return NextResponse.json(
      { error: "Tarama sırasında bir hata oluştu" },
      { status: 500 }
    )
  }
} 