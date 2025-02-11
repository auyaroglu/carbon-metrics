"use client"

import { useState, useEffect, useCallback } from "react"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MetricsChart } from "@/components/metrics-chart"
import { toast } from "@/components/ui/use-toast"
import { useSearchParams, useRouter } from "next/navigation"

type Url = {
  _id: string
  url: string
}

type Metric = {
  urlId: string
  cls: number
  lcp: number
  inp: number
  timestamp: string
}

export default function MetricsPage() {
  const [urls, setUrls] = useState<Url[]>([])
  const [selectedUrlId, setSelectedUrlId] = useState<string>("")
  const [selectedUrl, setSelectedUrl] = useState<string>("")
  const [period, setPeriod] = useState<"week" | "month">("week")
  const [metrics, setMetrics] = useState<Metric[]>([])
  const [selectedMetric, setSelectedMetric] = useState<"cls" | "lcp" | "inp">("cls")
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
  const searchParams = useSearchParams()
  const router = useRouter()

  // URL'leri yükle
  const fetchUrls = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/urls/all')
      const data = await response.json()
      setUrls(data.urls)

      // URL ID'si varsa, ilgili URL'i bul ve state'e kaydet
      const urlId = searchParams.get('urlId')
      if (urlId) {
        const url = data.urls.find((u: Url) => u._id === urlId)
        if (url) {
          setSelectedUrl(url.url)
        }
      }
    } catch (error) {
      console.error("URL&apos;ler yüklenirken hata oluştu:", error)
      toast({
        variant: "destructive",
        title: "Hata",
        description: "URL&apos;ler yüklenirken bir hata oluştu"
      })
    } finally {
      setLoading(false)
    }
  }, [searchParams])

  // Metrikleri yükle
  const fetchMetrics = useCallback(async () => {
    if (!selectedUrlId) return

    try {
      const response = await fetch(`/api/metrics?urlId=${selectedUrlId}&period=${period}`)
      const data = await response.json()
      setMetrics(data)
    } catch (_) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Metrikler yüklenirken bir hata oluştu.",
      })
    }
  }, [selectedUrlId, period])

  // Debounce işlemi için useEffect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // URL'leri yükle
  useEffect(() => {
    fetchUrls()
  }, [fetchUrls])

  useEffect(() => {
    const urlId = searchParams.get('urlId')
    if (urlId) {
      setSelectedUrlId(urlId)
    }
  }, [searchParams])

  useEffect(() => {
    if (selectedUrlId) {
      fetchMetrics()
    }
  }, [selectedUrlId, period, fetchMetrics])

  // Metrik değerlerinin durumunu kontrol et
  const getMetricStatus = (value: number, type: "cls" | "lcp" | "inp") => {
    switch (type) {
      case "cls":
        return value <= 0.1 ? "good" : value <= 0.25 ? "needs-improvement" : "poor"
      case "lcp":
        return value <= 2500 ? "good" : value <= 4000 ? "needs-improvement" : "poor"
      case "inp":
        return value <= 200 ? "good" : value <= 500 ? "needs-improvement" : "poor"
      default:
        return "unknown"
    }
  }

  // Min ve max değerleri hesapla
  const getMinMaxMetrics = () => {
    if (!metrics.length) return null

    const minMax = {
      cls: { min: Infinity, max: -Infinity },
      lcp: { min: Infinity, max: -Infinity },
      inp: { min: Infinity, max: -Infinity },
    }

    metrics.forEach((metric) => {
      minMax.cls.min = Math.min(minMax.cls.min, metric.cls)
      minMax.cls.max = Math.max(minMax.cls.max, metric.cls)
      minMax.lcp.min = Math.min(minMax.lcp.min, metric.lcp)
      minMax.lcp.max = Math.max(minMax.lcp.max, metric.lcp)
      minMax.inp.min = Math.min(minMax.inp.min, metric.inp)
      minMax.inp.max = Math.max(minMax.inp.max, metric.inp)
    })

    return minMax
  }

  const minMaxMetrics = getMinMaxMetrics()

  // URL'leri filtrele ve sırala (debounced search term ile)
  const filteredUrls = urls
    .filter(url => 
      url.url.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    )
    .sort((a, b) => {
      // Önce arama terimiyle tam eşleşenleri en üste getir
      const aExactMatch = a.url.toLowerCase() === debouncedSearchTerm.toLowerCase();
      const bExactMatch = b.url.toLowerCase() === debouncedSearchTerm.toLowerCase();
      if (aExactMatch && !bExactMatch) return -1;
      if (!aExactMatch && bExactMatch) return 1;

      // Sonra URL uzunluğuna göre sırala (kısadan uzuna)
      return a.url.length - b.url.length;
    });

  return (
    <div className="bg-background min-h-screen">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          <h1 className="text-3xl font-bold">Performans Metrikleri</h1>

          <div className="flex flex-col gap-4 md:flex-row">
            <div className="w-full md:w-64">
              <Select
                value={selectedUrlId}
                onValueChange={(value) => {
                  setSelectedUrlId(value)
                  const url = urls.find(u => u._id === value)
                  setSelectedUrl(url?.url || "")
                  router.push(`/metrics?urlId=${value}`)
                }}
              >
                <SelectTrigger>
                  <SelectValue 
                    placeholder={loading ? "Yükleniyor..." : "URL Seçiniz"}
                  >
                    {selectedUrlId ? "Bir URL seçildi" : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectGroup className="relative">
                    <SelectLabel className="px-3 py-2">URL'ler</SelectLabel>
                    <div className="bg-background sticky top-0 z-50 px-3 py-2 border-b">
                      <input
                        className="bg-background border-input w-full h-9 flex px-3 py-1 text-sm rounded-md border shadow-sm transition-colors focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-1 placeholder:text-muted-foreground"
                        placeholder="URL ara..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        autoComplete="off"
                      />
                    </div>
                    <div className="overflow-y-auto max-h-[200px]">
                      {loading ? (
                        <div className="text-muted-foreground px-3 py-2 text-sm">
                          Yükleniyor...
                        </div>
                      ) : filteredUrls.length === 0 ? (
                        <div className="text-muted-foreground px-3 py-2 text-sm">
                          URL bulunamadı
                        </div>
                      ) : (
                        filteredUrls.map((url) => (
                          <SelectItem 
                            key={url._id} 
                            value={url._id}
                            className="pr-8"
                          >
                            {url.url.replace(/^https?:\/\/(www\.)?/, '')}
                          </SelectItem>
                        ))
                      )}
                    </div>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button
                variant={period === "week" ? "default" : "outline"}
                onClick={() => setPeriod("week")}
              >
                Haftalık
              </Button>
              <Button
                variant={period === "month" ? "default" : "outline"}
                onClick={() => setPeriod("month")}
              >
                Aylık
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                variant={selectedMetric === "cls" ? "default" : "outline"}
                onClick={() => setSelectedMetric("cls")}
              >
                CLS
              </Button>
              <Button
                variant={selectedMetric === "lcp" ? "default" : "outline"}
                onClick={() => setSelectedMetric("lcp")}
              >
                LCP
              </Button>
              <Button
                variant={selectedMetric === "inp" ? "default" : "outline"}
                onClick={() => setSelectedMetric("inp")}
              >
                INP
              </Button>
            </div>
          </div>

          {selectedUrl && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="bg-muted/30 p-4 rounded-lg border flex flex-col gap-1.5">
                <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">Seçili URL</span>
                <a 
                  href={selectedUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary flex items-center gap-1 text-sm break-all group hover:underline"
                >
                  {selectedUrl}
                  <svg
                    className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-opacity"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              </div>
              
              <div className="bg-muted/30 p-4 rounded-lg border flex flex-col gap-1.5">
                <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">PageSpeed Insights</span>
                <a 
                  href={`https://pagespeed.web.dev/analysis?url=${encodeURIComponent(selectedUrl)}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-primary-foreground bg-primary hover:bg-primary/90 rounded-md transition-colors w-fit"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  Performans Raporunu Görüntüle
                </a>
              </div>
            </div>
          )}

          {metrics.length > 0 && (
            <>
              <MetricsChart 
                data={metrics} 
                selectedMetric={selectedMetric}
                getMetricStatus={getMetricStatus}
              />

              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div className="p-6 rounded-lg border">
                  <h3 className="mb-4 text-lg font-semibold">CLS Değerleri</h3>
                  <div className="space-y-2">
                    <p>En Düşük: <span className={`font-medium ${getMetricStatus(minMaxMetrics?.cls.min || 0, "cls") === "good" ? "text-green-600" : getMetricStatus(minMaxMetrics?.cls.min || 0, "cls") === "needs-improvement" ? "text-yellow-600" : "text-red-600"}`}>{minMaxMetrics?.cls.min.toFixed(3)}</span></p>
                    <p>En Yüksek: <span className={`font-medium ${getMetricStatus(minMaxMetrics?.cls.max || 0, "cls") === "good" ? "text-green-600" : getMetricStatus(minMaxMetrics?.cls.max || 0, "cls") === "needs-improvement" ? "text-yellow-600" : "text-red-600"}`}>{minMaxMetrics?.cls.max.toFixed(3)}</span></p>
                  </div>
                </div>

                <div className="p-6 rounded-lg border">
                  <h3 className="mb-4 text-lg font-semibold">LCP Değerleri</h3>
                  <div className="space-y-2">
                    <p>En Düşük: <span className={`font-medium ${getMetricStatus(minMaxMetrics?.lcp.min || 0, "lcp") === "good" ? "text-green-600" : getMetricStatus(minMaxMetrics?.lcp.min || 0, "lcp") === "needs-improvement" ? "text-yellow-600" : "text-red-600"}`}>{minMaxMetrics?.lcp.min.toFixed(0)}ms</span></p>
                    <p>En Yüksek: <span className={`font-medium ${getMetricStatus(minMaxMetrics?.lcp.max || 0, "lcp") === "good" ? "text-green-600" : getMetricStatus(minMaxMetrics?.lcp.max || 0, "lcp") === "needs-improvement" ? "text-yellow-600" : "text-red-600"}`}>{minMaxMetrics?.lcp.max.toFixed(0)}ms</span></p>
                  </div>
                </div>

                <div className="p-6 rounded-lg border">
                  <h3 className="mb-4 text-lg font-semibold">INP Değerleri</h3>
                  <div className="space-y-2">
                    <p>En Düşük: <span className={`font-medium ${getMetricStatus(minMaxMetrics?.inp.min || 0, "inp") === "good" ? "text-green-600" : getMetricStatus(minMaxMetrics?.inp.min || 0, "inp") === "needs-improvement" ? "text-yellow-600" : "text-red-600"}`}>{minMaxMetrics?.inp.min.toFixed(0)}ms</span></p>
                    <p>En Yüksek: <span className={`font-medium ${getMetricStatus(minMaxMetrics?.inp.max || 0, "inp") === "good" ? "text-green-600" : getMetricStatus(minMaxMetrics?.inp.max || 0, "inp") === "needs-improvement" ? "text-yellow-600" : "text-red-600"}`}>{minMaxMetrics?.inp.max.toFixed(0)}ms</span></p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
} 