import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// Initialize OpenAI client only if API key is available
let openai: OpenAI | null = null

if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
}

// Configure API route
export const maxDuration = 60 // 60 seconds timeout
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Check if OpenAI is configured
    if (!openai) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    // Get request body with size validation
    let body: any
    try {
      const text = await request.text()
      
      // Check payload size (50MB limit)
      const payloadSizeMB = Buffer.byteLength(text, 'utf8') / (1024 * 1024)
      if (payloadSizeMB > 50) {
        return NextResponse.json(
          { error: `Payload too large: ${payloadSizeMB.toFixed(2)}MB. Maximum allowed: 50MB.` },
          { status: 413 }
        )
      }
      
      body = JSON.parse(text)
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      )
    }

    const { message, scanId, screenshot } = body

    if (!message || !scanId || !screenshot) {
      return NextResponse.json(
        { error: 'Missing required fields: message, scanId, or screenshot' },
        { status: 400 }
      )
    }

    // Validate screenshot format (should be base64 data URL)
    if (!screenshot.startsWith('data:image/')) {
      return NextResponse.json(
        { error: 'Invalid screenshot format. Expected base64 data URL.' },
        { status: 400 }
      )
    }

    // Extract the base64 data from the data URL
    const base64Data = screenshot.split(',')[1]
    
    if (!base64Data) {
      return NextResponse.json(
        { error: 'Invalid screenshot data' },
        { status: 400 }
      )
    }

    // Check screenshot size (base64 is ~33% larger than binary)
    const screenshotSizeMB = (base64Data.length * 0.75) / (1024 * 1024)
    if (screenshotSizeMB > 20) {
      return NextResponse.json(
        { error: `Screenshot too large: ${screenshotSizeMB.toFixed(2)}MB. Please reduce image quality or resolution.` },
        { status: 413 }
      )
    }

    // Convert base64 to buffer for OpenAI API
    const imageBuffer = Buffer.from(base64Data, 'base64')

    // Create the system message for context
    const systemMessage = `You are an expert art historian, museum curator, and 3D model analyst. You're analyzing a screenshot from a 3D model viewer that may contain:

- 3D models of artwork, sculptures, or artifacts
- Museum exhibits and displays
- Architectural models and buildings
- Historical objects and specimens
- Cultural artifacts and installations

When analyzing the content, provide rich, detailed information similar to what you'd find in a museum catalog or art history textbook:

**For Artwork/Objects:**
- Artist/creator (if known)
- Title and date
- Medium and materials
- Dimensions and scale
- Historical context and significance
- Cultural or artistic movement
- Conservation status and condition

**For Museum Exhibits:**
- Exhibit name and location
- Historical background and acquisition
- Scientific or cultural significance
- Related specimens or artifacts
- Educational value and interpretation

**For Architectural Models:**
- Building name and location
- Architect and period
- Architectural style and features
- Historical significance
- Current status and preservation

**For Natural History Specimens:**
- Species name and classification
- Habitat and distribution
- Conservation status
- Scientific significance
- Collection history

Respond in an engaging, educational manner with specific details, measurements, and historical context. If you can identify specific objects, provide comprehensive information about them. Use bullet points for key facts and maintain a professional yet accessible tone.`

    // Send to OpenAI GPT-4o Vision
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemMessage
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: message
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Data}`,
                detail: 'high'
              }
            }
          ]
        }
      ],
      max_tokens: 2000,
      temperature: 0.7
    })

    const response = completion.choices[0]?.message?.content || 'Sorry, I could not analyze the room view.'

    return NextResponse.json({ response })

  } catch (error: any) {
    console.error('Chat API error:', error)
    
    // Handle specific OpenAI errors
    if (error.code === 'insufficient_quota') {
      return NextResponse.json(
        { error: 'OpenAI API quota exceeded. Please check your billing and usage limits.' },
        { status: 429 }
      )
    }

    // Handle timeout errors
    if (error.code === 'ECONNRESET' || error.message?.includes('timeout')) {
      return NextResponse.json(
        { error: 'Request timed out. Please try again with a smaller image or check your connection.' },
        { status: 408 }
      )
    }

    // Handle payload size errors
    if (error.status === 413 || error.message?.includes('too large')) {
      return NextResponse.json(
        { error: 'Image too large. Please reduce the screenshot quality or resolution before sending.' },
        { status: 413 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to process chat request. Please try again.' },
      { status: 500 }
    )
  }
}
