import { NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Url from "@/models/Url"
import Metric from "@/models/Metric"

interface MetricType {
  _id: string
  urlId: string
  cls: number
  lcp: number
  inp: number
  timestamp: Date
}

export async function GET() {
  try {
    await connectDB()

    // Her URL için en son metrikleri al
    const urls = await Url.find().lean()
    const urlsWithMetrics = await Promise.all(
      urls.map(async (url) => {
        const lastMetric = await Metric.findOne({ urlId: url._id })
          .sort({ timestamp: -1 })
          .lean() as MetricType | null

        if (!lastMetric) return null

        return {
          _id: url._id,
          url: url.url,
          lastScanned: lastMetric.timestamp,
          cls: lastMetric.cls,
          lcp: lastMetric.lcp,
          inp: lastMetric.inp,
          // CLS için ağırlıklı skor
          clsScore: lastMetric.cls > 0.25 ? 3 : lastMetric.cls > 0.1 ? 2 : 1,
          // LCP için ağırlıklı skor (mobil için değerler)
          lcpScore: lastMetric.lcp > 4000 ? 3 : lastMetric.lcp > 2500 ? 2 : 1,
          // INP için ağırlıklı skor
          inpScore: lastMetric.inp > 500 ? 3 : lastMetric.inp > 200 ? 2 : 1
        }
      })
    )

    // null değerleri filtrele
    const validUrls = urlsWithMetrics.filter((url): url is NonNullable<typeof url> => url !== null)

    // Önce CLS skoruna göre sırala
    const sortedByCls = validUrls.sort((a, b) => {
      // CLS skoru aynıysa LCP'ye bak
      if (a.clsScore === b.clsScore) {
        return b.lcpScore - a.lcpScore
      }
      return b.clsScore - a.clsScore
    })

    // Eğer tüm CLS skorları yeşil ise (1), LCP'ye göre sırala
    const allClsGood = sortedByCls.every(url => url.clsScore === 1)
    const finalSorted = allClsGood 
      ? validUrls.sort((a, b) => b.lcpScore - a.lcpScore)
      : sortedByCls

    return NextResponse.json(finalSorted.slice(0, 5))
  } catch (error) {
    console.error("En kötü performans gösteren URL'ler alınırken hata oluştu:", error)
    return NextResponse.json(
      { error: "En kötü performans gösteren URL'ler alınırken bir hata oluştu" },
      { status: 500 }
    )
  }
} 