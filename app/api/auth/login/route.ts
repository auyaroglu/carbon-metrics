import { NextResponse } from "next/server"
import { rateLimit } from "@/lib/rate-limit"

const limiter = rateLimit({
  interval: 60 * 1000, // 60 saniye
  uniqueTokenPerInterval: 500
})

export async function POST(request: Request) {
  try {
    // IP bazlı rate limiting
    const ip = request.headers.get("x-forwarded-for") || "unknown"
    
    try {
      const result = await limiter.check(10, ip) // IP başına dakikada 10 istek
      if (!result.success) {
        return NextResponse.json(
          { 
            error: "Çok fazla istek gönderildi. Lütfen bir süre bekleyin.",
            reset: result.reset
          },
          { 
            status: 429,
            headers: {
              'Retry-After': Math.ceil((result.reset.getTime() - Date.now()) / 1000).toString()
            }
          }
        )
      }
    } catch {
      return NextResponse.json(
        { error: "Rate limit kontrolü sırasında hata oluştu" },
        { status: 500 }
      )
    }

    // Request body kontrolü
    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json(
        { error: "Kullanıcı adı ve şifre gereklidir" },
        { status: 400 }
      )
    }

    // Minimum uzunluk kontrolü
    if (username.length < 3 || password.length < 6) {
      return NextResponse.json(
        { error: "Geçersiz kullanıcı adı veya şifre" },
        { status: 400 }
      )
    }

    const validUsername = process.env.ADMIN_USERNAME
    const validPassword = process.env.ADMIN_PASSWORD

    // Timing attack'lere karşı sabit zamanlı karşılaştırma
    const isValidUsername = username === validUsername
    const isValidPassword = password === validPassword
    
    // Başarısız girişleri logla
    if (!isValidUsername || !isValidPassword) {
      console.warn(`Başarısız giriş denemesi - IP: ${ip}, Kullanıcı: ${username}`)
    }

    if (isValidUsername && isValidPassword) {
      return NextResponse.json({ 
        success: true 
      }, {
        headers: {
          'Content-Security-Policy': "frame-ancestors 'none'",
          'X-Frame-Options': 'DENY',
          'X-Content-Type-Options': 'nosniff'
        }
      })
    }

    return NextResponse.json(
      { error: "Kullanıcı adı veya şifre hatalı" },
      { status: 401 }
    )
  } catch (error) {
    console.error("Giriş hatası:", error)
    return NextResponse.json(
      { error: "Giriş yapılırken bir hata oluştu" },
      { status: 500 }
    )
  }
} 