"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { format } from "date-fns"
import { tr } from "date-fns/locale"
import { useRouter } from "next/navigation"
import Link from "next/link"

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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Skeleton } from "@/components/ui/skeleton"
import { useScan } from "@/contexts/ScanContext"

interface UrlFromApi {
  _id: string;
  url: string;
  lastScanned: string | null;
  createdAt: string;
}

type SortField = 'url' | 'lastScanned' | 'createdAt';

export default function UrlsPage() {
  const [urls, setUrls] = useState<UrlFromApi[]>([])
  const [selectedUrls, setSelectedUrls] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [sortBy, setSortBy] = useState<SortField>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [searchTerm, setSearchTerm] = useState("")
  const router = useRouter()
  const { isScanning, progress, startScanning, updateProgress, stopScanning, cancelScanning } = useScan()

  const fetchUrls = async () => {
    try {
      const response = await fetch(
        `/api/urls?page=${currentPage}&sortBy=${sortBy}&sortOrder=${sortOrder}&search=${encodeURIComponent(searchTerm)}`
      )
      const data = await response.json()
      setUrls(data.urls)
      setTotalPages(data.totalPages)
    } catch (error) {
      console.error("URL'ler yüklenirken hata oluştu:", error)
      toast.error("URL'ler yüklenirken bir hata oluştu")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUrls()
  }, [currentPage, sortBy, sortOrder, searchTerm])


  const handleSelectUrl = (urlId: string) => {
    setSelectedUrls((prev) =>
      prev.includes(urlId)
        ? prev.filter((id) => id !== urlId)
        : [...prev, urlId]
    )
  }

  const handleSelectAll = () => {
    setSelectedUrls((prev) =>
      prev.length === urls.length ? [] : urls.map((url) => url._id)
    )
  }

  const handleScanUrls = async () => {
    if (selectedUrls.length === 0) {
      toast.error("Lütfen taranacak URL'leri seçin")
      return
    }

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ urls: selectedUrls }),
      })

      if (!response.ok) {
        throw new Error("Tarama işlemi başarısız oldu")
      }

      toast.success("Tarama işlemi başlatıldı")
      setSelectedUrls([])
    } catch (error) {
      console.error("Tarama sırasında hata oluştu:", error)
      toast.error("Tarama sırasında bir hata oluştu")
    }
  }

  const handleScanAllUrls = async () => {
    if (!window.confirm("Tüm URL'leri taramak istediğinizden emin misiniz?")) {
      return;
    }

    try {
      // Tarama durumunu başlat
      startScanning();

      // Önce tüm URL'leri al
      const urlsResponse = await fetch('/api/urls/all');
      if (!urlsResponse.ok) {
        throw new Error("URL'ler alınamadı");
      }
      const data = await urlsResponse.json();
      
      if (!data.urls || !Array.isArray(data.urls)) {
        throw new Error("URL'ler alınamadı");
      }

      // Jobs tablosunu temizle
      await fetch('/api/jobs', {
        method: 'DELETE'
      });

      // İlerleme durumunu güncelle
      updateProgress(0, '', data.urls.length);

      // Her URL için sıra numarası ile birlikte Jobs tablosuna kayıt ekle
      for (let i = 0; i < data.urls.length; i++) {
        await fetch('/api/jobs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            urlId: data.urls[i]._id,
            status: 'pending',
            order: i + 1
          })
        });
      }

      // İlk taramayı tetikle
      await fetch('/api/cron/scan?key=' + process.env.CRON_SECRET_KEY);

    } catch (error) {
      console.error("Tarama sırasında hata oluştu:", error);
      toast.error("Tarama sırasında bir hata oluştu");
      stopScanning();
    }
  };

  const handleCancelScan = async () => {
    try {
      await cancelScanning();
      await fetchUrls(); // Tabloyu yenile
    } catch (error) {
      console.error("İptal işlemi sırasında hata oluştu:", error);
      toast.error("İptal işlemi başarısız oldu");
    }
  };

  const handleDeleteSingleUrl = async (urlId: string) => {
    if (!window.confirm("Bu URL'yi silmek istediğinizden emin misiniz?")) {
      return
    }

    try {
      const response = await fetch(`/api/urls?ids=${urlId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("URL silme işlemi başarısız oldu")
      }

      toast.success("URL başarıyla silindi")
      fetchUrls()
      setSelectedUrls((prev) => prev.filter((id) => id !== urlId))
    } catch (error) {
      console.error("URL silinirken hata oluştu:", error)
      toast.error("URL silinirken bir hata oluştu")
    }
  }

  const handleDeleteUrls = async () => {
    if (selectedUrls.length === 0) {
      toast.error("Lütfen silinecek URL'leri seçin")
      return
    }

    if (!window.confirm("Seçili URL'leri silmek istediğinizden emin misiniz?")) {
      return
    }

    try {
      const response = await fetch(`/api/urls?ids=${selectedUrls.join(',')}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("URL silme işlemi başarısız oldu")
      }

      toast.success("Seçili URL'ler başarıyla silindi")
      fetchUrls()
      setSelectedUrls([])
    } catch (error) {
      console.error("URL'ler silinirken hata oluştu:", error)
      toast.error("URL'ler silinirken bir hata oluştu")
    }
  }

  const handleClearMetrics = async () => {
    if (!window.confirm("Tüm metrikleri silmek istediğinizden emin misiniz?")) {
      return;
    }

    try {
      const response = await fetch("/api/metrics/clear", {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Metrikler silinemedi");
      }

      toast.success("Tüm metrikler başarıyla silindi");
      fetchUrls(); // Tabloyu yenile
    } catch (error) {
      console.error("Metrikler silinirken hata oluştu:", error);
      toast.error("Metrikler silinirken bir hata oluştu");
    }
  };

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      // Aynı alan için sıralama yönünü değiştir
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      // Yeni alan için varsayılan olarak azalan sıralama
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortBy !== field) return '↕️'
    return sortOrder === 'asc' ? '↑' : '↓'
  }

  return (
    <div className="bg-background min-h-screen">
      <Navbar />
      <div className="container mx-auto py-10">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col justify-between items-start gap-4 sm:flex-row sm:items-center">
            <h2 className="text-2xl font-semibold">URL Listesi</h2>
            <div className="w-full flex flex-col gap-2 sm:w-auto sm:flex-row">
              <input
                type="text"
                placeholder="URL ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 rounded-md border focus:ring-primary focus:outline-none focus:ring-2 sm:w-auto"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="default"
                  onClick={() => router.push('/add-url')}
                  disabled={isScanning}
                  className="w-full sm:w-auto"
                >
                  Yeni URL Ekle
                </Button>
                <Button
                  variant="outline"
                  onClick={handleScanUrls}
                  disabled={loading || selectedUrls.length === 0 || isScanning}
                  className="w-full sm:w-auto"
                >
                  {loading ? "Taranıyor..." : "Seçilenleri Tara"}
                </Button>
                {isScanning ? (
                  <Button
                    variant="destructive"
                    onClick={handleCancelScan}
                    className="w-full sm:w-auto"
                  >
                    Taramayı İptal Et ({progress.total} URL)
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={handleScanAllUrls}
                    disabled={loading || isScanning}
                    className="w-full sm:w-auto"
                  >
                    {loading ? "Taranıyor..." : "Tümünü Tara"}
                  </Button>
                )}
                <Button
                  variant="destructive"
                  onClick={handleDeleteUrls}
                  disabled={selectedUrls.length === 0 || isScanning}
                  className="w-full sm:w-auto"
                >
                  Seçilenleri Sil
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleClearMetrics}
                  disabled={isScanning}
                  className="w-full sm:w-auto"
                >
                  Metrikleri Temizle
                </Button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={urls.length > 0 && selectedUrls.length === urls.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 min-w-[200px]"
                    onClick={() => handleSort('url')}
                  >
                    URL {getSortIcon('url')}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 min-w-[150px]"
                    onClick={() => handleSort('lastScanned')}
                  >
                    Son Tarama {getSortIcon('lastScanned')}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 min-w-[150px]"
                    onClick={() => handleSort('createdAt')}
                  >
                    Oluşturulma Tarihi {getSortIcon('createdAt')}
                  </TableHead>
                  <TableHead className="text-right min-w-[100px]">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  // Yükleme durumu için skeleton
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Skeleton className="w-4 h-4" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-[250px]" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-[150px]" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-[150px]" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="ml-auto w-16 h-8" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : urls.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      {searchTerm ? "Arama sonucu bulunamadı" : "Henüz hiç URL eklenmemiş"}
                    </TableCell>
                  </TableRow>
                ) : (
                  urls.map((url) => (
                    <TableRow key={url._id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedUrls.includes(url._id)}
                          onCheckedChange={() => handleSelectUrl(url._id)}
                        />
                      </TableCell>
                      <TableCell className="break-all">
                        <Link 
                          href={`/metrics?urlId=${url._id}`}
                          className="text-primary hover:underline"
                        >
                          {url.url}
                        </Link>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {url.lastScanned
                          ? format(new Date(url.lastScanned), "dd MMMM yyyy HH:mm", {
                              locale: tr,
                            })
                          : "Hiç taranmadı"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(url.createdAt), "dd MMMM yyyy HH:mm", {
                          locale: tr,
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSingleUrl(url._id)}
                        >
                          Sil
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={currentPage === 1}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => setCurrentPage(page)}
                          isActive={currentPage === page}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  )}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() =>
                        setCurrentPage((prev) =>
                          Math.min(prev + 1, totalPages)
                        )
                      }
                      disabled={currentPage === totalPages}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 