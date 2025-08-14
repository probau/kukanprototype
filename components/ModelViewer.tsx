'use client'

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import * as THREE from 'three'
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js'
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { Scan } from '@/types/scan'
import { Camera, Grid3X3 } from 'lucide-react'

interface ModelViewerProps {
  scan: Scan
}

export interface ModelViewerRef {
  takeScreenshot: () => string | null
}

export default forwardRef<ModelViewerRef, ModelViewerProps>(function ModelViewer({ scan }, ref) {
  const mountRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showGrid, setShowGrid] = useState(true)
  const [isCapturing, setIsCapturing] = useState(false)
  const [lightingMode, setLightingMode] = useState<'normal' | 'bright' | 'studio'>('bright') // Default to bright for photogrammetry
  const gridRef = useRef<THREE.GridHelper | null>(null)
  const lightsRef = useRef<THREE.Group | null>(null)

  // Expose screenshot method to parent component
  useImperativeHandle(ref, () => ({
    takeScreenshot: () => {
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current) {
        return null
      }

      try {
        setIsCapturing(true)
        
        // Render the current scene to ensure it's up to date
        rendererRef.current.render(sceneRef.current, cameraRef.current)
        
        // Get the canvas data as a base64 string
        const canvas = rendererRef.current.domElement
        const dataURL = canvas.toDataURL('image/jpeg', 0.9)
        
        // Reset capturing state after a short delay
        setTimeout(() => setIsCapturing(false), 500)
        
        return dataURL
      } catch (error) {
        console.error('Error taking screenshot:', error)
        setIsCapturing(false)
        return null
      }
    }
  }))

  const updateLighting = (mode: 'normal' | 'bright' | 'studio') => {
    if (!lightsRef.current) return
    
    const lights = lightsRef.current.children as THREE.Light[]
    
    switch (mode) {
      case 'bright':
        lights.forEach((light, index) => {
          if (light instanceof THREE.AmbientLight) {
            light.intensity = 1.2
          } else if (light instanceof THREE.DirectionalLight) {
            light.intensity = index === 0 ? 1.5 : 0.8
          } else if (light instanceof THREE.HemisphereLight) {
            light.intensity = 1.0
          }
        })
        break
      case 'studio':
        lights.forEach((light, index) => {
          if (light instanceof THREE.AmbientLight) {
            light.intensity = 0.6
          } else if (light instanceof THREE.DirectionalLight) {
            light.intensity = index === 0 ? 2.0 : 1.0
          } else if (light instanceof THREE.HemisphereLight) {
            light.intensity = 0.4
          }
        })
        break
      default: // normal
        lights.forEach((light, index) => {
          if (light instanceof THREE.AmbientLight) {
            light.intensity = 0.8
          } else if (light instanceof THREE.DirectionalLight) {
            light.intensity = index === 0 ? 1.0 : (index === 1 ? 0.4 : 0.3)
          } else if (light instanceof THREE.HemisphereLight) {
            light.intensity = 0.6
          }
        })
        break
    }
  }

  useEffect(() => {
    if (!mountRef.current) return

    // Scene setup
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf8f9fa) // Lighter background for better contrast
    sceneRef.current = scene

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    )
    camera.position.set(5, 5, 5)
    camera.lookAt(0, 0, 0)
    cameraRef.current = camera

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    rendererRef.current = renderer

    mountRef.current.appendChild(renderer.domElement)

    // Add OrbitControls for smooth camera movement
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.screenSpacePanning = false
    controls.minDistance = 0.5
    controls.maxDistance = 50
    controls.maxPolarAngle = Math.PI
    controlsRef.current = controls

    // Create lights group for easy management
    const lightsGroup = new THREE.Group()
    lightsRef.current = lightsGroup

    // Lighting - Enhanced for better visibility
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8) // Increased intensity
    lightsGroup.add(ambientLight)

    // Main directional light for shadows and primary illumination
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0)
    directionalLight.position.set(10, 10, 5)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.width = 2048
    directionalLight.shadow.mapSize.height = 2048
    directionalLight.shadow.camera.near = 0.5
    directionalLight.shadow.camera.far = 50
    lightsGroup.add(directionalLight)

    // Additional fill lights for better coverage
    const fillLight1 = new THREE.DirectionalLight(0xffffff, 0.4)
    fillLight1.position.set(-10, 5, 10)
    lightsGroup.add(fillLight1)

    const fillLight2 = new THREE.DirectionalLight(0xffffff, 0.3)
    fillLight2.position.set(5, -5, -10)
    lightsGroup.add(fillLight2)

    // Top light for overhead illumination
    const topLight = new THREE.DirectionalLight(0xffffff, 0.5)
    topLight.position.set(0, 15, 0)
    lightsGroup.add(topLight)

    // Hemisphere light for natural color balance
    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6)
    lightsGroup.add(hemisphereLight)

    // Add all lights to scene
    scene.add(lightsGroup)

    // Grid helper - will be repositioned after model loads
    const gridHelper = new THREE.GridHelper(10, 10)
    gridRef.current = gridHelper
    // Don't add initial grid to scene - wait for model to load and position it correctly

    // Load MTL materials first, then OBJ model
    const mtlLoader = new MTLLoader()
    const objLoader = new OBJLoader()
    
    setIsLoading(true)
    setError(null)

    // Check if MTL file exists
    const mtlPath = scan.modelPath.replace('.obj', '.mtl')
    const hasMtl = scan.hasMtl === true

    if (hasMtl) {
      // Load MTL first, then OBJ
      mtlLoader.load(
        mtlPath,
        (materials) => {
          materials.preload()
          objLoader.setMaterials(materials)
          
          // Now load OBJ with materials
          loadOBJModel()
        },
        (progress) => {
          // MTL loading progress
        },
        (error) => {
          console.warn('MTL loading failed, loading OBJ without materials:', error)
          // Continue without materials
          loadOBJModel()
        }
      )
    } else {
      // Load OBJ directly without materials
      loadOBJModel()
    }

    function loadOBJModel() {
      objLoader.load(
        scan.modelPath,
        (object) => {
          // Calculate model bounds BEFORE centering
          const box = new THREE.Box3().setFromObject(object)
          const center = box.getCenter(new THREE.Vector3())
          const size = box.getSize(new THREE.Vector3())
          
          // Center the model at origin
          object.position.sub(center)
          
          // Scale to fit in view (but don't make it too small)
          const maxDim = Math.max(size.x, size.y, size.z)
          const scale = Math.max(1.0, 5 / maxDim) // Ensure minimum scale of 1.0
          object.scale.setScalar(scale)
          
          // Reposition and resize the existing grid to match model
          if (gridRef.current) {
            // Remove old grid from scene
            scene.remove(gridRef.current)
          }
          
          // Create new grid with appropriate size
          const gridSize = Math.max(size.x, size.z) * scale
          const newGridHelper = new THREE.GridHelper(gridSize, 20)
          newGridHelper.position.copy(object.position)
          
          // Update the grid reference
          gridRef.current = newGridHelper
          
          // Add to scene only if grid should be visible
          if (showGrid) {
            scene.add(newGridHelper)
          }
          
          // Add to scene
          scene.add(object)
          setIsLoading(false)

          // Calculate final model bounds AFTER scaling and positioning
          const finalBox = new THREE.Box3().setFromObject(object)
          const finalSize = finalBox.getSize(new THREE.Vector3())
          const finalCenter = finalBox.getCenter(new THREE.Vector3())
          
          // Debug logging
          console.log('Model loaded:', {
            originalSize: size,
            scaledSize: finalSize,
            center: finalCenter,
            scale: scale
          })
          
          // Calculate optimal camera distance to show entire model
          const maxSize = Math.max(finalSize.x, finalSize.y, finalSize.z)
          const optimalDistance = maxSize * 3.0 // Increased to 3x for better framing
          
          // Calculate camera position to ensure entire model is visible
          const fov = camera.fov * (Math.PI / 180) // Convert to radians
          const aspect = camera.aspect
          
          // Calculate required distance based on field of view
          const requiredDistanceX = (finalSize.x / 2) / Math.tan(fov / 2)
          const requiredDistanceY = (finalSize.y / 2) / Math.tan(fov / 2) / aspect
          const requiredDistance = Math.max(requiredDistanceX, requiredDistanceY, optimalDistance)
          
          console.log('Camera positioning:', {
            maxSize,
            optimalDistance,
            requiredDistance,
            fov: camera.fov,
            aspect,
            cameraPosition: [
              finalCenter.x + requiredDistance,
              finalCenter.y + requiredDistance * 0.6,
              finalCenter.z + requiredDistance
            ]
          })
          
          // Position camera to show entire model
          camera.position.set(
            finalCenter.x + requiredDistance,
            finalCenter.y + requiredDistance * 0.6,
            finalCenter.z + requiredDistance
          )
          camera.lookAt(finalCenter)
          
          // Update OrbitControls target and limits
          controls.target.copy(finalCenter)
          controls.minDistance = maxSize * 0.3   // Can get closer to model
          controls.maxDistance = maxSize * 8     // Can zoom out further
          
          // Update camera projection
          camera.updateProjectionMatrix()
          
          // Update controls
          controls.update()
        },
        (progress) => {
          // Progress callback
        },
        (error) => {
          console.error('Error loading OBJ:', error)
          setError('Failed to load 3D model')
          setIsLoading(false)
        }
      )
    }

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate)
      
      // Update OrbitControls
      if (controlsRef.current) {
        controlsRef.current.update()
      }
      
      renderer.render(scene, camera)
    }
    animate()

    // Handle resize
    const handleResize = () => {
      if (!mountRef.current || !camera || !renderer) return
      
      const width = mountRef.current.clientWidth
      const height = mountRef.current.clientHeight
      
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }

    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
      
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement)
      }
      
      renderer.dispose()
    }
  }, [scan])

  // Apply initial lighting mode
  useEffect(() => {
    if (lightsRef.current) {
      updateLighting(lightingMode)
    }
  }, [lightingMode])

  // Handle grid visibility changes
  useEffect(() => {
    if (gridRef.current && sceneRef.current) {
      if (showGrid) {
        sceneRef.current.add(gridRef.current)
      } else {
        sceneRef.current.remove(gridRef.current)
      }
    }
  }, [showGrid])

  return (
    <div className="relative w-full h-full">
      <div ref={mountRef} className="w-full h-full" />
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading 3D model...</p>
          </div>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
          <div className="text-center text-red-600">
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Screenshot capture indicator */}
      {isCapturing && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 pointer-events-none">
          <div className="bg-white bg-opacity-90 rounded-lg px-4 py-3 shadow-lg flex items-center space-x-3">
            <Camera className="h-5 w-5 text-primary animate-pulse" />
            <span className="text-sm font-medium text-gray-800">Capturing 3D View...</span>
          </div>
        </div>
      )}
      
      {/* Controls hint */}
      <div className="absolute bottom-2 left-2 text-xs text-gray-500 bg-white bg-opacity-75 px-2 py-1 rounded">
        Left click + drag to rotate • Right click + drag to pan • Scroll to zoom
      </div>

      {/* Combined Controls Panel */}
      <div className="absolute top-2 right-2 bg-white bg-opacity-90 rounded-lg shadow-lg p-3">
        <div className="flex items-center space-x-4">
          {/* Reset Camera Button */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                if (controlsRef.current && cameraRef.current) {
                  // Reset to optimal viewing position
                  const camera = cameraRef.current
                  const controls = controlsRef.current
                  
                  // Get current model bounds to calculate optimal position
                  const scene = sceneRef.current
                  if (scene) {
                    // Find the 3D model object (skip lights, grid, etc.)
                    let modelObject = null
                    scene.traverse((child) => {
                      if (child.type === 'Group' && child !== lightsRef.current && child !== gridRef.current) {
                        modelObject = child
                      }
                    })
                    
                    if (modelObject) {
                      const box = new THREE.Box3().setFromObject(modelObject)
                      const size = box.getSize(new THREE.Vector3())
                      const center = box.getCenter(new THREE.Vector3())
                      const maxSize = Math.max(size.x, size.y, size.z)
                      
                      // Calculate optimal camera distance using the same logic
                      const optimalDistance = maxSize * 3.0
                      
                      // Calculate required distance based on field of view
                      const fov = camera.fov * (Math.PI / 180)
                      const aspect = camera.aspect
                      const requiredDistanceX = (size.x / 2) / Math.tan(fov / 2)
                      const requiredDistanceY = (size.y / 2) / Math.tan(fov / 2) / aspect
                      const requiredDistance = Math.max(requiredDistanceX, requiredDistanceY, optimalDistance)
                      
                      // Position camera to show entire model
                      camera.position.set(
                        center.x + requiredDistance,
                        center.y + requiredDistance * 0.6,
                        center.z + requiredDistance
                      )
                      camera.lookAt(center)
                      camera.updateProjectionMatrix()
                      
                      // Update controls
                      controls.target.copy(center)
                      controls.update()
                    }
                  }
                }
              }}
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
})
