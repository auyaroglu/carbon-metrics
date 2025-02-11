"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { tr } from "date-fns/locale"
import { toast } from "sonner"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface Url {
  _id: string
  url: string
  lastScanned: string
  createdAt: string
}

interface UrlMetric {
  _id: string
  url: string
  lastScanned: string
  cls: number
  lcp: number
  inp: number
}

interface DegradedMetric {
  _id: string
  url: string
  lastScanned: string
  cls: number
  previousCls: number
  clsDifference: number
  lcp: number
  previousLcp: number
  lcpDifference: number
  inp: number
}

export default function Home() {
  const [currentPage, setCurrentPage] = useState(1)
  const [worstUrls, setWorstUrls] = useState<UrlMetric[]>([])
  const [degradedUrls, setDegradedUrls] = useState<DegradedMetric[]>([])
  const [metricFilter, setMetricFilter] = useState<'both' | 'cls' | 'lcp'>('both')
  const [sortBy, setSortBy] = useState<'timestamp' | 'cls' | 'lcp'>('timestamp')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const fetchUrls = async () => {
    try {
      const response = await fetch(`/api/urls?page=${currentPage}`)
      const data = await response.json()
    } catch (error) {
      toast.error("URL'ler yüklenirken bir hata oluştu")
    }
  }

  useEffect(() => {
    fetchUrls()
  }, [currentPage])

  useEffect(() => {
    const fetchWorstUrls = async () => {
      try {
        const response = await fetch("/api/metrics/worst")
        const data = await response.json()
        setWorstUrls(data)
      } catch (error) {
        console.error("En kötü skorlu URL'ler yüklenirken hata oluştu:", error)
      }
    }

    fetchWorstUrls()
  }, [])

  const fetchDegradedUrls = async () => {
    try {
      const response = await fetch(
        `/api/metrics/degraded?metric=${metricFilter}&sortBy=${sortBy}&order=${sortOrder}`
      )
      const data = await response.json()
      setDegradedUrls(data)
    } catch (error) {
      console.error("Kötüleşen metrikler yüklenirken hata oluştu:", error)
    }
  }

  useEffect(() => {
    fetchDegradedUrls()
  }, [metricFilter, sortBy, sortOrder])


  const handleSort = (column: 'timestamp' | 'cls' | 'lcp') => {
    if (sortBy === column) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('desc')
    }
  }

  return (
    <div className="bg-background min-h-screen">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-8">
          <section className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">Web Performans Analizi</h1>
            <p className="text-muted-foreground text-lg">
              Web sitelerinizin performans metriklerini analiz edin ve zaman içindeki değişimlerini takip edin.
            </p>
          </section>
          
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <Link href="/urls" className="block">
              <div className="p-6 rounded-lg border transition-colors hover:border-primary">
                <h2 className="mb-2 text-2xl font-semibold">URL'ler</h2>
                <p className="text-muted-foreground">
                  URL'leri listeleyin, tarayın ve yönetin.
                </p>
              </div>
            </Link>

            <Link href="/add-url" className="block">
              <div className="p-6 rounded-lg border transition-colors hover:border-primary">
                <h2 className="mb-2 text-2xl font-semibold">URL Ekle</h2>
                <p className="text-muted-foreground">
                  Yeni bir web sitesi ekleyin ve performans metriklerini analiz edin.
                </p>
              </div>
            </Link>
            
            <Link href="/metrics" className="block">
              <div className="p-6 rounded-lg border transition-colors hover:border-primary">
                <h2 className="mb-2 text-2xl font-semibold">Metrikleri Görüntüle</h2>
                <p className="text-muted-foreground">
                  Mevcut web sitelerinin performans metriklerini inceleyin.
                </p>
              </div>
            </Link>
          </div>

          {worstUrls.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">En Kötü Performans Gösteren URL'ler</h2>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>URL</TableHead>
                      <TableHead>CLS</TableHead>
                      <TableHead>LCP</TableHead>
                      <TableHead>INP</TableHead>
                      <TableHead>Son Tarama</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {worstUrls.map((url) => (
                      <TableRow key={url._id}>
                        <TableCell>
                          <Link 
                            href={`/metrics?urlId=${url._id}`}
                            className="text-primary hover:underline"
                          >
                            {url.url}
                          </Link>
                        </TableCell>
                        <TableCell className={url.cls <= 0.1 ? "text-green-600" : url.cls <= 0.25 ? "text-yellow-600" : "text-red-600"}>
                          {url.cls.toFixed(3)}
                        </TableCell>
                        <TableCell className={url.lcp <= 2500 ? "text-green-600" : url.lcp <= 4000 ? "text-yellow-600" : "text-red-600"}>
                          {url.lcp.toFixed(0)}ms
                        </TableCell>
                        <TableCell className={url.inp <= 200 ? "text-green-600" : url.inp <= 500 ? "text-yellow-600" : "text-red-600"}>
                          {url.inp.toFixed(0)}ms
                        </TableCell>
                        <TableCell>
                          {format(new Date(url.lastScanned), "dd MMMM yyyy HH:mm", {
                            locale: tr,
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Kötüleşen Metrikler</h2>
              <div className="space-x-2">
                <Button
                  variant={metricFilter === 'both' ? 'default' : 'outline'}
                  onClick={() => setMetricFilter('both')}
                >
                  Tümü
                </Button>
                <Button
                  variant={metricFilter === 'cls' ? 'default' : 'outline'}
                  onClick={() => setMetricFilter('cls')}
                >
                  CLS
                </Button>
                <Button
                  variant={metricFilter === 'lcp' ? 'default' : 'outline'}
                  onClick={() => setMetricFilter('lcp')}
                >
                  LCP
                </Button>
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>URL</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('cls')}
                    >
                      CLS {sortBy === 'cls' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('lcp')}
                    >
                      LCP {sortBy === 'lcp' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('timestamp')}
                    >
                      Son Tarama {sortBy === 'timestamp' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {degradedUrls.map((url) => (
                    <TableRow key={url._id}>
                      <TableCell>
                        <Link 
                          href={`/metrics?urlId=${url._id}`}
                          className="text-primary hover:underline"
                        >
                          {url.url}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className={url.clsDifference > 0 ? "text-red-600" : "text-green-600"}>
                            {url.cls.toFixed(3)}
                          </div>
                          <div className="text-muted-foreground text-sm">
                            Önceki: {url.previousCls.toFixed(3)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className={url.lcpDifference > 0 ? "text-red-600" : "text-green-600"}>
                            {url.lcp.toFixed(0)}ms
                          </div>
                          <div className="text-muted-foreground text-sm">
                            Önceki: {url.previousLcp.toFixed(0)}ms
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(url.lastScanned), "dd MMMM yyyy HH:mm", {
                          locale: tr,
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                  {degradedUrls.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-4 text-center">
                        Kötüleşen metrik bulunamadı
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
