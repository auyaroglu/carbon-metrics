"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")

  const handleLogin = async () => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        throw new Error("Kullanıcı adı veya şifre hatalı");
      }

      // Cookie'yi güvenli bir şekilde ayarla
      document.cookie = "auth=true; path=/; secure; samesite=strict"
      
      // Toast göster
      toast.success("Giriş yapıldı")

      // Yönlendirme yap
      setTimeout(() => {
        router.push("/")
        router.refresh() // Middleware'in yeni cookie'yi görmesi için sayfayı yenile
      }, 500)
    } catch (error) {
      toast.error("Kullanıcı adı veya şifre hatalı")
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleLogin()
    }
  }

  return (
    <div className="bg-background min-h-screen flex justify-center items-center">
      <div className="w-full max-w-md p-8 space-y-8 rounded-lg border shadow-lg">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Carbon Metrics</h2>
          <p className="text-muted-foreground mt-2">Web Performans Analizi</p>
        </div>
        <div className="space-y-4">
          <div>
            <Input
              type="text"
              placeholder="Kullanıcı Adı"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={handleKeyPress}
            />
          </div>
          <div>
            <Input
              type="password"
              placeholder="Şifre"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyPress}
            />
          </div>
          <Button className="w-full" onClick={handleLogin}>
            Giriş Yap
          </Button>
        </div>
      </div>
    </div>
  )
} 