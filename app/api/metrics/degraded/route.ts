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

export async function GET(request: Request) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const metric = searchParams.get('metric') || 'both'
    const sortBy = searchParams.get('sortBy') || 'timestamp'
    const order = searchParams.get('order') || 'desc'

    // Her URL için son iki metriği al
    const urls = await Url.find().lean()
    const urlsWithMetrics = await Promise.all(
      urls.map(async (url) => {
        const lastTwoMetrics = await Metric.find({ urlId: url._id })
          .sort({ timestamp: -1 })
          .limit(2)
          .lean() as MetricType[]

        if (lastTwoMetrics.length < 2) return null

        const [latest, previous] = lastTwoMetrics
        const clsDegraded = latest.cls > previous.cls
        const lcpDegraded = latest.lcp > previous.lcp

        // Metrik filtresine göre kontrol
        if (metric === 'cls' && !clsDegraded) return null
        if (metric === 'lcp' && !lcpDegraded) return null
        if (metric === 'both' && !clsDegraded && !lcpDegraded) return null

        return {
          _id: url._id,
          url: url.url,
          lastScanned: latest.timestamp,
          cls: latest.cls,
          previousCls: previous.cls,
          clsDifference: latest.cls - previous.cls,
          lcp: latest.lcp,
          previousLcp: previous.lcp,
          lcpDifference: latest.lcp - previous.lcp,
          inp: latest.inp,
        }
      })
    )

    // null değerleri filtrele
    const validUrls = urlsWithMetrics.filter((url): url is NonNullable<typeof url> => url !== null)

    // Sıralama yap
    const sortedUrls = validUrls.sort((a, b) => {
      const multiplier = order === 'desc' ? -1 : 1
      
      switch (sortBy) {
        case 'cls':
          return (b.clsDifference - a.clsDifference) * multiplier
        case 'lcp':
          return (b.lcpDifference - a.lcpDifference) * multiplier
        case 'timestamp':
        default:
          return (new Date(b.lastScanned).getTime() - new Date(a.lastScanned).getTime()) * multiplier
      }
    })

    return NextResponse.json(sortedUrls)
  } catch (error) {
    console.error("Kötüleşen metrikler alınırken hata oluştu:", error)
    return NextResponse.json(
      { error: "Kötüleşen metrikler alınırken bir hata oluştu" },
      { status: 500 }
    )
  }
} 