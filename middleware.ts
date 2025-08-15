import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Handle large payloads for chat API
  if (request.nextUrl.pathname === '/api/chat' && request.method === 'POST') {
    // Check content-length header
    const contentLength = request.headers.get('content-length')
    if (contentLength) {
      const sizeMB = parseInt(contentLength) / (1024 * 1024)
      if (sizeMB > 50) {
        return NextResponse.json(
          { error: `Payload too large: ${sizeMB.toFixed(2)}MB. Maximum allowed: 50MB.` },
          { status: 413 }
        )
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/chat',
}
