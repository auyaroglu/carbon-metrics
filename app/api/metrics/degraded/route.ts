import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import Url from '@/models/Url'
import Metric from '@/models/Metric'
import { Document } from 'mongoose'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface MetricType {
  _id: string
  urlId: string
  cls: number
  lcp: number
  inp: number
  timestamp: Date
}

interface UrlType {
  _id: string
  url: string
  lastScanned: Date | null
}

export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const metricFilter = searchParams.get('metric') || 'both'
    const sortBy = searchParams.get('sortBy') || 'timestamp'
    const order = searchParams.get('order') || 'desc'

    const urls = (await Url.find({}).lean()) as unknown as UrlType[]

    const urlsWithMetrics = await Promise.all(
      urls.map(async url => {
        const lastTwoMetrics = (await Metric.find({ urlId: url._id })
          .sort({ timestamp: -1 })
          .limit(2)
          .lean()) as unknown as MetricType[]

        if (lastTwoMetrics.length < 2) return null

        const [current, previous] = lastTwoMetrics

        const clsDifference = current.cls - previous.cls
        const lcpDifference = current.lcp - previous.lcp

        // Metrik filtresine göre kontrol
        if (
          (metricFilter === 'cls' && clsDifference <= 0) ||
          (metricFilter === 'lcp' && lcpDifference <= 0) ||
          (metricFilter === 'both' && clsDifference <= 0 && lcpDifference <= 0)
        ) {
          return null
        }

        return {
          _id: url._id,
          url: url.url,
          lastScanned: url.lastScanned,
          cls: current.cls,
          previousCls: previous.cls,
          clsDifference,
          lcp: current.lcp,
          previousLcp: previous.lcp,
          lcpDifference,
          inp: current.inp,
        }
      })
    )

    // null değerleri filtrele
    const degradedUrls = urlsWithMetrics.filter(
      (url): url is NonNullable<typeof url> => url !== null
    )

    // Sıralama
    const sortedUrls = degradedUrls.sort((a, b) => {
      const getValue = (url: (typeof degradedUrls)[0]) => {
        switch (sortBy) {
          case 'cls':
            return url.clsDifference
          case 'lcp':
            return url.lcpDifference
          default:
            return new Date(url.lastScanned || 0).getTime()
        }
      }

      const aValue = getValue(a)
      const bValue = getValue(b)

      return order === 'asc' ? aValue - bValue : bValue - aValue
    })

    return NextResponse.json(sortedUrls)
  } catch (error) {
    console.error('Kötüleşen metrikler alınırken hata:', error)
    return NextResponse.json(
      { error: 'Kötüleşen metrikler alınırken bir hata oluştu' },
      { status: 500 }
    )
  }
}
