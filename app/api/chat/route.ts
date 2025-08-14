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
    const systemMessage = `This is a screenshot of a 3D room view from a user's current camera perspective. The user is asking questions about what they can see from their current view. 

Please analyze the visual content and provide helpful, accurate responses about:
- Furniture and objects visible in the current view
- Spatial relationships and distances
- Dimensions and measurements (if visible)
- Layout and positioning from this perspective
- Any architectural features visible

Respond naturally and conversationally, focusing on what's actually visible in the current screenshot.`

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
      max_tokens: 1000,
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
