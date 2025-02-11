"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function Navbar() {
  const { theme, setTheme } = useTheme()
  const pathname = usePathname()

  const navigation = [
    { name: "Ana Sayfa", href: "/" },
    { name: "URL'ler", href: "/urls" },
    { name: "URL Ekle", href: "/add-url" },
    { name: "Metrikler", href: "/metrics" },
  ]

  return (
    <header className="border-b">
      <div className="container mx-auto h-16 flex justify-between items-center px-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-bold">
            Carbon Metrics
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-sm transition-colors hover:text-primary",
                  pathname === item.href
                    ? "text-foreground font-medium"
                    : "text-muted-foreground"
                )}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="w-5 h-5 transition-all scale-100 rotate-0 dark:-rotate-90 dark:scale-0" />
            <Moon className="w-5 h-5 absolute transition-all scale-0 rotate-90 dark:scale-100 dark:rotate-0" />
            <span className="sr-only">Tema değiştir</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              document.cookie = "auth=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
              window.location.href = "/login";
            }}
          >
            Çıkış Yap
          </Button>
        </div>
      </div>

      {/* Mobil menü */}
      <div className="border-t md:hidden">
        <nav className="container mx-auto flex justify-between px-4 py-2">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "text-sm py-2 transition-colors hover:text-primary",
                pathname === item.href
                  ? "text-foreground font-medium"
                  : "text-muted-foreground"
              )}
            >
              {item.name}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
} 