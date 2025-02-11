"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/use-toast"

export default function AddUrlPage() {
  const router = useRouter()
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // URL'i ekle
      const addResponse = await fetch("/api/urls", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      })

      if (!addResponse.ok) {
        const error = await addResponse.json()
        throw new Error(error.error || "URL eklenirken bir hata oluştu")
      }

      toast({
        title: "Başarılı",
        description: "URL başarıyla eklendi.",
      })

      router.push("/urls")
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: error instanceof Error ? error.message : "Bir hata oluştu",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-background min-h-screen">
      <Navbar />
      <div className="container mx-auto py-10">
        <div className="max-w-xl mx-auto space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold">Yeni URL Ekle</h1>
            <p className="text-muted-foreground">
              Takip etmek istediğiniz web sitesinin URL&apos;sini girin
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="url" className="text-sm font-medium">
                Web Sitesi URL&apos;i
              </label>
              <Input
                id="url"
                type="url"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
            </div>
            
            <Button type="submit" disabled={loading}>
              {loading ? "Ekleniyor..." : "URL Ekle"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
} 