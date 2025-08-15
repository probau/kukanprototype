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
    <div className="absolute top-4 left-4 right-4 z-10">
      {/* Top Controls Bar */}
      <div className="flex items-center justify-between bg-white bg-opacity-90 backdrop-blur-sm rounded-lg shadow-lg p-3">


        {/* Right Side - Camera and Display Controls */}
        <div className="flex items-center space-x-4">
          {/* Camera Reset */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onResetCamera}
              className="px-2 py-1 text-xs rounded bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
              title="Reset Camera View"
            >
              Reset View
            </button>
          </div>

          {/* Divider */}
          <div className="w-px h-8 bg-gray-300"></div>

          {/* Grid Toggle */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-600 font-medium">Grid</span>
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`p-2 rounded-lg transition-all ${
                showGrid 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-gray-600 text-white hover:bg-gray-700'
              }`}
              title={showGrid ? 'Hide Grid' : 'Show Grid'}
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
          </div>

          {/* Divider */}
          <div className="w-px h-8 bg-gray-300"></div>

          {/* Lighting Controls */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-600 font-medium">Lighting</span>
            <div className="flex space-x-1">
              <button
                onClick={() => {
                  setLightingMode('normal')
                  updateLighting('normal')
                }}
                className={`px-2 py-1 text-xs rounded ${
                  lightingMode === 'normal' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Normal
              </button>
              <button
                onClick={() => {
                  setLightingMode('bright')
                  updateLighting('bright')
                }}
                className={`px-2 py-1 text-xs rounded ${
                  lightingMode === 'bright' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Bright
              </button>
              <button
                onClick={() => {
                  setLightingMode('studio')
                  updateLighting('studio')
                }}
                className={`px-2 py-1 text-xs rounded ${
                  lightingMode === 'studio' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Studio
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
