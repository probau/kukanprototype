import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { Scan } from '@/types/scan'

export async function GET() {
  try {
    const scansDir = path.join(process.cwd(), 'public', 'scans')
    
    // Check if scans directory exists
    try {
      await fs.access(scansDir)
    } catch {
      // If scans directory doesn't exist, return empty array
      return NextResponse.json({ scans: [] })
    }

    const scanFolders = await fs.readdir(scansDir, { withFileTypes: true })
    const scans: Scan[] = []

    for (const folder of scanFolders) {
      if (folder.isDirectory()) {
        const folderPath = path.join(scansDir, folder.name)
        const files = await fs.readdir(folderPath)
        
        // Check for required files
        const hasModel = files.some(file => file.endsWith('.obj'))
        const hasMtl = files.some(file => file.endsWith('.mtl'))
        const hasTextures = files.some(file => file === 'textures')
        const hasRoomImage = files.some(file => file === 'room.jpg')
        
        if (hasModel && hasRoomImage) {
          const modelFile = files.find(file => file.endsWith('.obj'))
          const mtlFile = hasMtl ? files.find(file => file.endsWith('.mtl')) : undefined
          const textureFolder = hasTextures ? 'textures' : undefined
          
          scans.push({
            id: folder.name,
            name: folder.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            folder: folder.name,
            modelPath: `/scans/${folder.name}/${modelFile}`,
            texturePath: textureFolder ? `/scans/${folder.name}/${textureFolder}` : undefined,
            roomImagePath: `/scans/${folder.name}/room.jpg`,
            hasMtl: hasMtl
          })
        }
      }
    }

    // Sort scans alphabetically
    scans.sort((a, b) => a.name.localeCompare(b.name))

    return NextResponse.json({ scans })
  } catch (error) {
    console.error('Error loading scans:', error)
    return NextResponse.json(
      { error: 'Failed to load scans' },
      { status: 500 }
    )
  }
}
