export interface Scan {
  id: string
  name: string
  folder: string
  modelPath: string
  texturePath?: string
  roomImagePath?: string  // Now optional since we use dynamic screenshots
  hasMtl?: boolean
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface ScanFolder {
  name: string
  path: string
  hasModel: boolean
  hasTextures: boolean
  hasRoomImage?: boolean  // Now optional
}
