import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { promises as fs } from 'fs'
import path from 'path'

// Initialize OpenAI client only if API key is available
let openai: OpenAI | null = null

if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
}

export async function POST(request: NextRequest) {
  try {
    // Check if OpenAI is configured
    if (!openai) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    const { message, scanId, screenshot } = await request.json()

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
    
    if (error.code === 'insufficient_quota') {
      return NextResponse.json(
        { error: 'OpenAI API quota exceeded. Please check your billing and usage limits.' },
        { status: 429 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    )
  }
}
