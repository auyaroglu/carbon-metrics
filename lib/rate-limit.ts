import { LRUCache } from 'lru-cache'

export interface RateLimitOptions {
  uniqueTokenPerInterval?: number
  interval?: number
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: Date
}

export function rateLimit(options?: RateLimitOptions) {
  const tokenCache = new LRUCache({
    max: options?.uniqueTokenPerInterval || 500,
    ttl: options?.interval || 60000,
  })

  return {
    check: async (limit: number, token: string): Promise<RateLimitResult> => {
      const tokenCount = (tokenCache.get(token) as number[]) || [0]
      const currentUsage = tokenCount[0]
      const isRateLimited = currentUsage >= limit
      const reset = new Date(Date.now() + (options?.interval || 60000))

      if (!isRateLimited) {
        tokenCache.set(token, [currentUsage + 1])
      }

      return {
        success: !isRateLimited,
        limit,
        remaining: isRateLimited ? 0 : limit - currentUsage - 1,
        reset
      }
    },
  }
} 