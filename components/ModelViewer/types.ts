export interface ModelViewerRef {
  takeScreenshot: () => string | null
}

export interface ModelViewerProps {
  scan: Scan
}

export interface Scan {
  id: string
  name: string
  description?: string
  modelPath: string
  fileFormat?: string
  hasMtl?: boolean
}

export type LightingMode = 'normal' | 'bright' | 'studio'

export interface CameraControls {
  position: THREE.Vector3
  rotation: THREE.Euler
  modelSize: number
  moveForward: (distance: number) => void
  pan: (deltaX: number, deltaY: number) => void
  rotate: (deltaX: number, deltaY: number) => void
  setModelSize: (size: number) => void
  update: () => void
}
