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

    const { message, scanId, roomImagePath } = await request.json()

    if (!message || !scanId || !roomImagePath) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Read the room image file
    const imagePath = path.join(process.cwd(), 'public', roomImagePath)
    const imageBuffer = await fs.readFile(imagePath)
    const base64Image = imageBuffer.toString('base64')

    // Prepare the system message
    const systemMessage = `This is an image of a real indoor space. A standard A4 sheet of paper (21cm x 29.7cm) is taped to the wall and labeled "A4". Use it as a scale reference to estimate the size and layout of objects or spaces in your response.

Please analyze the room and provide detailed, accurate information about:
- Furniture and objects present
- Approximate dimensions using the A4 paper as reference
- Spatial relationships and layout
- Potential placement suggestions for new furniture
- Any notable architectural features

Be specific about measurements and use the A4 paper scale to provide realistic estimates.`

    // Call OpenAI GPT-4o Vision API
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemMessage
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: message
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0.7,
    })

    const aiResponse = response.choices[0]?.message?.content || 'No response received'

    return NextResponse.json({ response: aiResponse })
  } catch (error) {
    console.error('Chat API error:', error)
    
    if (error instanceof Error && error.message.includes('API key')) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    )
  }
}
