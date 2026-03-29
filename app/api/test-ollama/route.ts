import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const ollamaProxyUrl = process.env.OLLAMA_PROXY_URL
  const model = process.env.OLLAMA_MODEL || 'lfm2'
  const authToken = process.env.OLLAMA_AUTH_TOKEN

  console.log('[v0] Testing Ollama API...')
  console.log('[v0] OLLAMA_PROXY_URL:', ollamaProxyUrl ? 'configured' : 'NOT SET')
  console.log('[v0] OLLAMA_MODEL:', model)
  console.log('[v0] OLLAMA_AUTH_TOKEN:', authToken ? 'configured' : 'NOT SET')

  if (!ollamaProxyUrl) {
    return NextResponse.json({
      success: false,
      error: 'OLLAMA_PROXY_URL environment variable is not set',
      config: {
        proxyUrl: null,
        model,
        hasAuthToken: !!authToken
      }
    }, { status: 500 })
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`
    }

    const requestBody = {
      message: 'hi',
      model
    }

    console.log('[v0] Sending request to:', `${ollamaProxyUrl}/api/chat`)
    console.log('[v0] Request body:', JSON.stringify(requestBody))

    const startTime = Date.now()
    const response = await fetch(`${ollamaProxyUrl}/api/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    })

    const latency = Date.now() - startTime
    console.log('[v0] Response status:', response.status)
    console.log('[v0] Response latency:', latency, 'ms')

    if (!response.ok) {
      const errorText = await response.text()
      console.log('[v0] Error response:', errorText)
      return NextResponse.json({
        success: false,
        error: `Ollama API returned status ${response.status}`,
        details: errorText,
        config: {
          proxyUrl: ollamaProxyUrl,
          model,
          hasAuthToken: !!authToken
        },
        latency
      }, { status: response.status })
    }

    const data = await response.json()
    console.log('[v0] Ollama response:', JSON.stringify(data))

    return NextResponse.json({
      success: true,
      message: 'Ollama API is working!',
      request: {
        message: 'hi',
        model
      },
      response: data,
      config: {
        proxyUrl: ollamaProxyUrl,
        model,
        hasAuthToken: !!authToken
      },
      latency
    })

  } catch (error) {
    console.error('[v0] Ollama test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      config: {
        proxyUrl: ollamaProxyUrl,
        model,
        hasAuthToken: !!authToken
      }
    }, { status: 500 })
  }
}
