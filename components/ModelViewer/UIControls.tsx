import React from 'react'
import { Grid3X3 } from 'lucide-react'
import { LightingMode } from './types'

interface UIControlsProps {
  showGrid: boolean
  setShowGrid: (show: boolean) => void
  lightingMode: LightingMode
  setLightingMode: (mode: LightingMode) => void
  updateLighting: (mode: LightingMode) => void
  onResetCamera: () => void
}

export function UIControls({
  showGrid,
  setShowGrid,
  lightingMode,
  setLightingMode,
  updateLighting,
  onResetCamera
}: UIControlsProps) {

  return (
    <div className="absolute top-3 left-3 z-10">
      {/* Compact Controls Bar */}
      <div className="flex items-center bg-white bg-opacity-80 backdrop-blur-sm rounded-md shadow-md p-2 space-x-2">
        {/* Camera Reset */}
        <button
          onClick={onResetCamera}
          className="px-2 py-1 text-xs rounded bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
          title="Reset Camera View"
        >
          Reset
        </button>

        {/* Grid Toggle */}
        <button
          onClick={() => setShowGrid(!showGrid)}
          className={`p-1.5 rounded transition-all ${
            showGrid 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-gray-600 text-white hover:bg-gray-700'
          }`}
          title={showGrid ? 'Hide Grid' : 'Show Grid'}
        >
          <Grid3X3 className="h-3 w-3" />
        </button>

        {/* Lighting Controls */}
        <div className="flex space-x-1">
          <button
            onClick={() => {
              setLightingMode('normal')
              updateLighting('normal')
            }}
            className={`px-1.5 py-1 text-xs rounded ${
              lightingMode === 'normal' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            title="Normal Lighting"
          >
            N
          </button>
          <button
            onClick={() => {
              setLightingMode('bright')
              updateLighting('bright')
            }}
            className={`px-1.5 py-1 text-xs rounded ${
              lightingMode === 'bright' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            title="Bright Lighting"
          >
            B
          </button>
          <button
            onClick={() => {
              setLightingMode('studio')
              updateLighting('studio')
            }}
            className={`px-1.5 py-1 text-xs rounded ${
              lightingMode === 'studio' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            title="Studio Lighting"
          >
            S
          </button>
        </div>
      </div>
    </div>
  )
}
