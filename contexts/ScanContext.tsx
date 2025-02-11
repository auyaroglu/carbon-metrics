"use client"

import { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button"

interface ScanContextType {
  isScanning: boolean;
  progress: {
    scanned: number;
    total: number;
    currentUrl?: string;
  };
  startScanning: () => void;
  startSingleScan: (urlId: string) => Promise<void>;
  updateProgress: (scanned: number, currentUrl: string, total?: number) => void;
  stopScanning: () => void;
  cancelScanning: () => Promise<void>;
}

const ScanContext = createContext<ScanContextType | undefined>(undefined);

export function ScanProvider({ children }: { children: React.ReactNode }) {
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState({ scanned: 0, total: 0, currentUrl: '' });
  const [toastId, setToastId] = useState<string | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // Jobs tablosunu kontrol et
  useEffect(() => {
    const checkJobs = async () => {
      try {
        const response = await fetch('/api/jobs/status');
        const data = await response.json();
        
        const totalJobs = data.pending + data.processing;
        
        if (totalJobs > 0) {
          setIsScanning(true);
          setProgress(prev => ({
            ...prev,
            total: totalJobs,
            scanned: 0
          }));
          showScanningToast({
            total: totalJobs,
            scanned: 0,
            currentUrl: ''
          });
        } else {
          // Hiç job kalmadıysa scanning durumunu kapat
          if (isScanning) {
            stopScanning();
          }
        }
      } catch (error) {
        console.error('Jobs durumu kontrol edilirken hata:', error);
        if (isScanning) {
          stopScanning();
        }
      }
    };

    const interval = setInterval(checkJobs, 5000);
    checkJobs();
    
    return () => clearInterval(interval);
  }, [isScanning, toastId]);

  const showScanningToast = (progressData: typeof progress) => {
    const id = 'scanning-toast';
    setToastId(id);

    toast.custom(
      (t) => (
        <div className="bg-background border rounded-lg p-4 shadow-lg min-w-[350px]">
          <div className="flex items-center gap-2 mb-3">
            <svg 
              className="w-5 h-5" 
              style={{ animation: 'spin 0.8s linear infinite' }}
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24"
            >
              <style>
                {`
                  @keyframes spin {
                    from {
                      transform: rotate(0deg);
                    }
                    to {
                      transform: rotate(360deg);
                    }
                  }
                `}
              </style>
              <circle 
                className="opacity-25" 
                cx="12" 
                cy="12" 
                r="10" 
                stroke="#fff" 
                strokeWidth="4"
              ></circle>
              <path 
                className="opacity-75" 
                fill="#3b82f6" 
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span className="font-medium">Tarama Devam Ediyor</span>
          </div>
          <div className="text-muted-foreground mb-3 text-sm">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Kalan İşlem:</span>
                <span className="font-medium">{progressData.total} URL</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                <div 
                  className="bg-primary h-full rounded-full transition-all duration-300" 
                  style={{ 
                    width: `${100 - ((progressData.total) / (progressData.total + 1)) * 100}%` 
                  }}
                ></div>
              </div>
            </div>
          </div>
          <Button 
            variant="destructive" 
            size="sm"
            className="w-full"
            onClick={cancelScanning}
          >
            İptal Et
          </Button>
        </div>
      ),
      { 
        id, 
        duration: Infinity,
        dismissible: false
      }
    );
  };

  const startSingleScan = async (urlId: string) => {
    try {
      setIsScanning(true);
      setProgress({ scanned: 0, total: 1, currentUrl: '' });
      showScanningToast({ scanned: 0, total: 1, currentUrl: '' });

      const response = await fetch("/api/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ urlId })
      });

      if (!response.ok) {
        throw new Error("Tarama işlemi başlatılamadı");
      }

      // Tarama durumunu kontrol et
      const checkStatus = setInterval(async () => {
        const statusResponse = await fetch('/api/jobs/status');
        const data = await statusResponse.json();
        
        if (data.processing === 0) {
          clearInterval(checkStatus);
          stopScanning();
          if (data.failed > 0) {
            toast.error("Tarama sırasında hata oluştu");
          } else {
            toast.success("Tarama tamamlandı");
          }
        }
      }, 2000);

    } catch (error) {
      console.error("Tarama sırasında hata oluştu:", error);
      toast.error("Tarama sırasında bir hata oluştu");
      stopScanning();
    }
  };

  const startScanning = async () => {
    try {
      // Tüm URL'lerin sayısını al
      const countResponse = await fetch(`/api/urls/count`);
      const { total } = await countResponse.json();
      const totalUrls = total;

      // Yeni bir AbortController oluştur
      const controller = new AbortController();
      setAbortController(controller);

      setIsScanning(true);
      setProgress({ scanned: 0, total: totalUrls, currentUrl: '' });
      showScanningToast({ scanned: 0, total: totalUrls, currentUrl: '' });
      
      const response = await fetch("/api/scan/all", {
        method: "POST",
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error("Toplu tarama işlemi başarısız oldu");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Stream okunamadı");
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const messages = new TextDecoder()
          .decode(value)
          .split('\n\n')
          .filter(msg => msg.trim().startsWith('data: '))
          .map(msg => JSON.parse(msg.replace('data: ', '')));

        for (const message of messages) {
          switch (message.type) {
            case 'progress':
              updateProgress(message.scanned, message.currentUrl);
              break;
            case 'error':
              toast.error(`${message.url} taranırken hata: ${message.error}`);
              break;
            case 'complete':
              stopScanning();
              toast.success("Tarama işlemi tamamlandı");
              break;
            case 'cancelled':
              stopScanning();
              toast.info("Tarama işlemi iptal edildi");
              break;
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        toast.info("Tarama işlemi iptal edildi");
      } else {
        console.error("Tarama sırasında hata oluştu:", error);
        toast.error("Tarama sırasında bir hata oluştu");
      }
      stopScanning();
    }
  };

  const updateProgress = (scanned: number, currentUrl: string, total?: number) => {
    setProgress(prev => {
      const newProgress = { 
        ...prev, 
        scanned, 
        currentUrl,
        total: total !== undefined ? total : prev.total 
      };
      showScanningToast(newProgress);
      return newProgress;
    });
  };

  const stopScanning = () => {
    setIsScanning(false);
    setProgress({ scanned: 0, total: 0, currentUrl: '' });
    setAbortController(null);
    if (toastId) {
      toast.dismiss(toastId);
      setToastId(null);
    }
  };

  const cancelScanning = async () => {
    if (!window.confirm("Tarama işlemini iptal etmek istediğinizden emin misiniz?")) {
      return;
    }

    try {
      // Önce state'i temizle ve toast'u kaldır
      stopScanning();

      // Sonra jobs kayıtlarını sil
      const deleteResponse = await fetch("/api/jobs", {
        method: "DELETE",
      });

      if (!deleteResponse.ok) {
        throw new Error("Jobs kayıtları silinemedi");
      }

      toast.info("Tarama işlemi iptal edildi");
    } catch (error) {
      console.error("İptal işlemi sırasında hata:", error);
      toast.error("İptal işlemi başarısız oldu");
    }
  };

  return (
    <ScanContext.Provider value={{ 
      isScanning, 
      progress, 
      startScanning,
      startSingleScan,
      updateProgress, 
      stopScanning,
      cancelScanning 
    }}>
      {children}
    </ScanContext.Provider>
  );
}

export function useScan() {
  const context = useContext(ScanContext);
  if (context === undefined) {
    throw new Error('useScan must be used within a ScanProvider');
  }
  return context;
} 