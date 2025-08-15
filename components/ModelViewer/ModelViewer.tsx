'use client'

import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { Scan, LightingMode } from './types'
import { createCameraControls } from './CameraControls'
import { createLights, updateLighting } from './Lighting'
import { loadGLTFModel, loadOBJModel } from './ModelLoader'
import { playEntranceAnimation } from './EntranceAnimation'
import { UIControls } from './UIControls'
import { useModelViewer } from './hooks/useModelViewer'

export interface ModelViewerProps {
  scan: Scan
}

export interface ModelViewerRef {
  takeScreenshot: () => string | null
}

const ModelViewer = forwardRef<ModelViewerRef, ModelViewerProps>(({ scan }, ref) => {
  const mountRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<ReturnType<typeof createCameraControls> | null>(null)
  const lightsRef = useRef<THREE.Group | null>(null)
  const gridRef = useRef<THREE.GridHelper | null>(null)
  const modelRef = useRef<THREE.Object3D | null>(null)
  const animationCleanupRef = useRef<(() => void) | null>(null)

  const {
    isLoading,
    setIsLoading,
    error,
    setError,
    showGrid,
    setShowGrid,
    lightingMode,
    setLightingMode,
    isAnimating,
    setIsAnimating,
    showControlsHint,
    setShowControlsHint,
    isAnimatingRef,
    animationRef,
    cleanupAnimation
  } = useModelViewer()

  // Initialize Three.js scene
  useEffect(() => {
    if (!mountRef.current) return

    // Scene setup
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf0f0f0)
    sceneRef.current = scene

    // Camera setup - UNLIMITED zoom range
    const camera = new THREE.PerspectiveCamera(
      75,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.0001,  // Near clipping plane - allows zooming VERY close
      1000000   // Far clipping plane - allows zooming VERY far
    )
    camera.position.set(0, 2, 0)
    camera.lookAt(0, 0, 0)
    cameraRef.current = camera

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true // Required for screenshots
    })
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.setPixelRatio(window.devicePixelRatio)
    rendererRef.current = renderer

    // Create camera controls
    const controls = createCameraControls(camera)
    controlsRef.current = controls

    // Create and add lights
    const lights = createLights()
    lightsRef.current = lights
    scene.add(lights)

    // Create grid with z-fighting prevention
    const grid = new THREE.GridHelper(20, 20, 0x888888, 0xcccccc)
    
    // Position grid slightly below models to prevent z-fighting
    grid.position.y = -0.01
    
    // Adjust grid material properties to reduce z-fighting
    if (grid.material instanceof THREE.Material) {
      grid.material.depthTest = true
      grid.material.depthWrite = false
      grid.material.transparent = true
      grid.material.opacity = 0.8
    }
    
    // Set render order to ensure grid renders before models
    grid.renderOrder = -1
    
    gridRef.current = grid
    scene.add(grid)

    // Add to DOM
    mountRef.current.appendChild(renderer.domElement)

    // Handle window resize
    const handleResize = () => {
      if (!mountRef.current || !camera || !renderer) return
      
      const width = mountRef.current.clientWidth
      const height = mountRef.current.clientHeight
      
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }

    window.addEventListener('resize', handleResize)

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate)
      
      if (renderer && scene && camera) {
        renderer.render(scene, camera)
      }
    }
    animate()

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
      
      // Cancel any ongoing animation
      cleanupAnimation()
      
      // Remove from DOM
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement)
      }
      
      // Dispose of renderer
      if (renderer) {
        renderer.dispose()
      }
    }
  }, [cleanupAnimation])

  // Load model when scan changes
  useEffect(() => {
    if (!sceneRef.current || !controlsRef.current) return

    setIsLoading(true)
    setError(null)

    console.log('🔄 Starting scene cleanup for new scan:', scan.name)
    
    // Clean up any ongoing animation
    if (animationCleanupRef.current) {
      console.log('⏹️ Stopping ongoing animation')
      animationCleanupRef.current()
      animationCleanupRef.current = null
    }

    // Clean up existing model and resources
    if (modelRef.current) {
      // Remove from scene
      sceneRef.current.remove(modelRef.current)
      
      // Dispose of geometries and materials to free memory
      modelRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (child.geometry) {
            child.geometry.dispose()
          }
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(material => material.dispose())
            } else {
              child.material.dispose()
            }
          }
        }
        // Also dispose of any textures
        if (child instanceof THREE.Mesh && child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((material: THREE.Material) => {
              const mat = material as any
              if (mat.map) mat.map.dispose()
              if (mat.normalMap) mat.normalMap.dispose()
              if (mat.roughnessMap) mat.roughnessMap.dispose()
              if (mat.metalnessMap) mat.metalnessMap.dispose()
              if (mat.envMap) mat.envMap.dispose()
            })
          } else {
            const mat = child.material as any
            if (mat.map) mat.map.dispose()
            if (mat.normalMap) mat.normalMap.dispose()
            if (mat.roughnessMap) mat.roughnessMap.dispose()
            if (mat.metalnessMap) mat.metalnessMap.dispose()
            if (mat.envMap) mat.envMap.dispose()
          }
        }
      })
      
      modelRef.current = null
    }

    // Clear ALL objects from scene except lights, camera, and grid
    if (sceneRef.current) {
      const objectsToRemove: THREE.Object3D[] = []
      sceneRef.current.traverse((child) => {
        // Keep lights, camera, and grid, remove everything else
        if (child !== lightsRef.current && 
            child !== cameraRef.current && 
            child !== gridRef.current &&
            child !== modelRef.current) {
          objectsToRemove.push(child)
        }
      })
      
      console.log(`🧹 Found ${objectsToRemove.length} objects to remove from scene`)
      
      // Remove all other objects
      objectsToRemove.forEach(obj => {
        console.log('🗑️ Removing object:', obj.name || obj.type, 'from scene')
        sceneRef.current!.remove(obj)
        if (obj instanceof THREE.Mesh) {
          if (obj.geometry) obj.geometry.dispose()
          if (obj.material) {
            if (Array.isArray(obj.material)) {
              obj.material.forEach(material => material.dispose())
            } else {
              obj.material.dispose()
            }
          }
        }
      })
    }

    // Clear renderer cache to free memory
    if (rendererRef.current) {
      rendererRef.current.info.reset()
    }

    // Clear any cached textures in the texture loader
    if (THREE.Cache) {
      THREE.Cache.clear()
    }

    // Reset camera controls to default size for new model
    if (controlsRef.current) {
      controlsRef.current.setModelSize(1.0)
      // Reset camera to initial position and rotation for new model
      controlsRef.current.position.set(0, 2, 0)
      controlsRef.current.rotation.set(0, 0, 0, 'YXZ')
      controlsRef.current.update()
    }

    // Reset camera to initial position and rotation
    if (cameraRef.current) {
      cameraRef.current.position.set(0, 2, 0)
      cameraRef.current.lookAt(0, 0, 0)
      cameraRef.current.updateMatrixWorld()
    }

    // Determine file format and load accordingly
    // Handle both file paths and blob URLs
    let fileExtension: string | undefined
    
    if (scan.modelPath.startsWith('blob:')) {
      // For blob URLs, try to get extension from scan properties or infer from scan type
      if (scan.fileFormat) {
        fileExtension = scan.fileFormat.toLowerCase()
      } else if (scan.modelPath.includes('.obj')) {
        fileExtension = 'obj'
      } else if (scan.modelPath.includes('.glb') || scan.modelPath.includes('.gltf')) {
        fileExtension = 'glb'
      } else {
        // Default fallback - try to extract from any remaining path info
        const pathMatch = scan.modelPath.match(/\.([a-zA-Z0-9]+)(?:[?#]|$)/)
        fileExtension = pathMatch ? pathMatch[1].toLowerCase() : undefined
      }
    } else {
      // For regular file paths, extract extension normally
      fileExtension = scan.modelPath.split('.').pop()?.toLowerCase()
    }
    
    console.log('🔍 File format detection:', { modelPath: scan.modelPath, fileFormat: scan.fileFormat, detectedExtension: fileExtension })

    if (fileExtension === 'glb' || fileExtension === 'gltf') {
      const loader = new GLTFLoader()
      loader.load(
        scan.modelPath,
        (gltf) => {
          console.log('📦 Loading GLTF model:', scan.name)
          loadGLTFModel(gltf, sceneRef.current!, {
            onModelLoaded: (object, size, center, isSmallModel) => {
              console.log('✅ GLTF model loaded:', scan.name, 'Size:', size, 'Center:', center, 'IsSmall:', isSmallModel)
              modelRef.current = object
              
              // Update camera controls with model size for movement speed
              if (controlsRef.current) {
                const maxDim = Math.max(size.x, size.y, size.z)
                controlsRef.current.setModelSize(maxDim)
              }
              
              // Apply different camera logic for small vs. large models
              if (isSmallModel) {
                // Small model - position camera almost touching the ground
                console.log('📷 Positioning camera for small model at (0, 0.01, 0)')
                controlsRef.current!.position.set(0, 0.01, 0)
                controlsRef.current!.rotation.set(0, 0, 0, 'YXZ')
                controlsRef.current!.update()
                
                // Also update the actual camera
                if (cameraRef.current) {
                  cameraRef.current.position.set(0, 0.01, 0)
                  cameraRef.current.lookAt(0, 0, 0)
                  cameraRef.current.updateMatrixWorld()
                }
              } else {
                // Large model - keep camera at user-specified position (0, 2, 0) looking at (0, 0, 0)
                console.log('📷 Positioning camera for large model at (0, 2, 0)')
                controlsRef.current!.position.set(0, 2, 0)
                controlsRef.current!.rotation.set(0, 0, 0, 'YXZ')
                controlsRef.current!.update()
                
                // Also update the actual camera
                if (cameraRef.current) {
                  cameraRef.current.position.set(0, 2, 0)
                  cameraRef.current.lookAt(0, 0, 0)
                  cameraRef.current.updateMatrixWorld()
                }
              }
              
              // Play entrance animation with model size consideration
              startEntranceAnimation(isSmallModel)
            },
            onError: (error) => {
              setError(error)
              setIsLoading(false)
            },
            onLoadingComplete: () => {
              setIsLoading(false)
            }
          })
        },
        (progress) => {
          console.log('GLTF loading progress:', (progress.loaded / progress.total * 100) + '%')
        },
        (error) => {
          console.error('GLTF loading failed:', error)
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          setError(`Failed to load GLTF model: ${errorMessage}`)
          setIsLoading(false)
        }
      )
    } else if (fileExtension === 'obj') {
      console.log('📦 Loading OBJ model:', scan.name)
      loadOBJModel(scan, sceneRef.current!, {
        onModelLoaded: (object, size, center, isSmallModel) => {
          console.log('✅ OBJ model loaded:', scan.name, 'Size:', size, 'Center:', center, 'IsSmall:', isSmallModel)
          modelRef.current = object
          
          // Update camera controls with model size for movement speed
          if (controlsRef.current) {
            const maxDim = Math.max(size.x, size.y, size.z)
            controlsRef.current.setModelSize(maxDim)
          }
          
          // Apply different camera logic for small vs. large models
          if (isSmallModel) {
            // Small model - position camera almost touching the ground
            console.log('📷 Positioning camera for small model at (0, 0.01, 0)')
            controlsRef.current!.position.set(0, 0.01, 0)
            controlsRef.current!.rotation.set(0, 0, 0, 'YXZ')
            controlsRef.current!.update()
            
            // Also update the actual camera
            if (cameraRef.current) {
              cameraRef.current.position.set(0, 0.01, 0)
              cameraRef.current.lookAt(0, 0, 0)
              cameraRef.current.updateMatrixWorld()
            }
          } else {
            // Large model - keep camera at user-specified position (0, 2, 0) looking at (0, 0, 0)
            console.log('📷 Positioning camera for large model at (0, 2, 0)')
            controlsRef.current!.position.set(0, 2, 0)
            controlsRef.current!.rotation.set(0, 0, 0, 'YXZ')
            controlsRef.current!.update()
            
            // Also update the actual camera
            if (cameraRef.current) {
              cameraRef.current.position.set(0, 2, 0)
              cameraRef.current.lookAt(0, 0, 0)
              cameraRef.current.updateMatrixWorld()
            }
          }
          
          // Play entrance animation
          startEntranceAnimation()
        },
        onError: (error) => {
          setError(error)
          setIsLoading(false)
        },
        onLoadingComplete: () => {
          setIsLoading(false)
        }
      })
    } else {
      const errorMsg = fileExtension 
        ? `Unsupported file format: ${fileExtension}` 
        : `Could not determine file format from path: ${scan.modelPath}`
      console.error('❌ File format error:', errorMsg)
      setError(errorMsg)
      setIsLoading(false)
    }
  }, [scan])

  // Update grid visibility and positioning
  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.visible = showGrid
      
      // Ensure grid stays positioned below models to prevent z-fighting
      if (showGrid) {
        gridRef.current.position.y = -0.01
      }
    }
  }, [showGrid])

  // Update lighting
  useEffect(() => {
    if (lightsRef.current) {
      updateLighting(lightsRef.current, lightingMode)
    }
  }, [lightingMode])

  // Mouse event handlers
  useEffect(() => {
    if (!mountRef.current || !controlsRef.current) return

    let isMouseDown = false
    let isRightMouseDown = false
    let lastMouseX = 0
    let lastMouseY = 0

    const onMouseDown = (event: MouseEvent) => {
      // Disable controls during entrance animation
      if (isAnimatingRef.current) return
      
      isMouseDown = true
      isRightMouseDown = event.button === 2 // Right mouse button
      lastMouseX = event.clientX
      lastMouseY = event.clientY
    }

    const onMouseMove = (event: MouseEvent) => {
      // Disable controls during entrance animation
      if (isAnimatingRef.current) return
      
      if (!isMouseDown || !controlsRef.current) return

      const deltaX = event.clientX - lastMouseX
      const deltaY = event.clientY - lastMouseY

      if (isRightMouseDown) {
        // Right click + drag = pan
        controlsRef.current.pan(deltaX, deltaY)
      } else {
        // Left click + drag = rotate
        controlsRef.current.rotate(deltaX, deltaY)
      }

      lastMouseX = event.clientX
      lastMouseY = event.clientY
    }

    const onMouseUp = () => {
      isMouseDown = false
      isRightMouseDown = false
    }

    const onWheel = (event: WheelEvent) => {
      // Disable controls during entrance animation
      if (isAnimatingRef.current) return
      
      if (!controlsRef.current) return

      // Zoom in = move forward, Zoom out = move backward in view direction
      const baseZoomSpeed = 0.03
      const sizeMultiplier = Math.max(0.1, controlsRef.current.modelSize)
      const zoomSpeed = baseZoomSpeed * sizeMultiplier

      const zoomDirection = event.deltaY > 0 ? -1 : 1 // Negative deltaY = zoom in (forward)
      const zoomDistance = zoomDirection * zoomSpeed * Math.max(0.1, controlsRef.current.position.length())

      controlsRef.current.moveForward(zoomDistance)
    }

    const onContextMenu = (event: Event) => {
      event.preventDefault() // Prevent right-click context menu
    }

    // Add event listeners
    mountRef.current.addEventListener('mousedown', onMouseDown)
    mountRef.current.addEventListener('mousemove', onMouseMove)
    mountRef.current.addEventListener('mouseup', onMouseUp)
    mountRef.current.addEventListener('wheel', onWheel)
    mountRef.current.addEventListener('contextmenu', onContextMenu)

    // Cleanup
    return () => {
      if (mountRef.current) {
        mountRef.current.removeEventListener('mousedown', onMouseDown)
        mountRef.current.removeEventListener('mousemove', onMouseMove)
        mountRef.current.removeEventListener('mouseup', onMouseUp)
        mountRef.current.removeEventListener('wheel', onWheel)
        mountRef.current.removeEventListener('contextmenu', onContextMenu)
      }
    }
  }, [isAnimatingRef])

  // Implement entrance animation
  const startEntranceAnimation = (isSmallModel: boolean = false) => {
    if (!controlsRef.current) return

    setIsAnimating(true)
    isAnimatingRef.current = true

    const cleanup = playEntranceAnimation(controlsRef.current, {
      onAnimationStart: () => {
        // Animation started
      },
      onAnimationComplete: () => {
        // Animation complete - ensure camera maintains focus on (0, 0, 0) after animation
        if (controlsRef.current && cameraRef.current) {
          // Force camera to look at center one final time
          cameraRef.current.lookAt(0, 0, 0)
          // Update the camera's matrix to reflect the new orientation
          cameraRef.current.updateMatrixWorld()
          // Sync the controls rotation to match the camera's actual orientation
          controlsRef.current.rotation.copy(cameraRef.current.rotation)
        }
        
        setIsAnimating(false)
        isAnimatingRef.current = false
        animationRef.current = null

        // Show controls hint briefly after animation
        setShowControlsHint(true)
        setTimeout(() => setShowControlsHint(false), 3000)
      }
    }, isSmallModel)

    animationCleanupRef.current = cleanup
  }

  // Implement camera reset
  const onResetCamera = () => {
    if (!controlsRef.current) return

    // Reset to initial position and rotation
    controlsRef.current.position.set(0, 2, 0)
    controlsRef.current.rotation.set(0, 0, 0, 'YXZ')
    controlsRef.current.update()

    // Play entrance animation
    startEntranceAnimation()
  }



  // Implement lighting update
  const updateLightingMode = (mode: LightingMode) => {
    if (lightsRef.current) {
      updateLighting(lightsRef.current, mode)
    }
  }

  // Expose screenshot method via ref
  useImperativeHandle(ref, () => ({
    takeScreenshot: () => {
      if (!rendererRef.current || !mountRef.current) return null

      try {
        if (sceneRef.current && cameraRef.current) {
          rendererRef.current.render(sceneRef.current, cameraRef.current)
        }

        const canvas = rendererRef.current.domElement
        return canvas.toDataURL('image/png')
      } catch (error) {
        console.error('Screenshot failed:', error)
        return null
      }
    }
  }))

  return (
    <div className="relative w-full h-full">
      {/* 3D Viewer Container */}
      <div 
        ref={mountRef} 
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* UI Controls */}
      <UIControls
        showGrid={showGrid}
        setShowGrid={setShowGrid}
        lightingMode={lightingMode}
        setLightingMode={setLightingMode}
        updateLighting={updateLightingMode}
        onResetCamera={onResetCamera}
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 pointer-events-none">
          <div className="bg-white bg-opacity-90 rounded-lg px-4 py-3 shadow-lg flex items-center space-x-3">
            <div className="animate-pulse">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <span className="text-sm font-medium text-gray-800">Loading Model...</span>
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 pointer-events-none">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg max-w-md">
            <div className="flex items-center space-x-2">
              <div className="text-red-500">⚠️</div>
              <span className="text-sm font-medium">{error}</span>
            </div>
          </div>
        </div>
      )}

      {/* Controls Hint - appears after entrance animation */}
      {showControlsHint && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black bg-opacity-80 text-white px-6 py-4 rounded-lg shadow-2xl transform transition-all duration-500 ease-out">
            <div className="text-center">
              <div className="text-lg font-semibold mb-2">🎥 Camera Ready!</div>
              <div className="text-sm text-gray-300 space-y-1">
                <div>• <strong>Left-click + drag</strong> to rotate view</div>
                <div>• <strong>Right-click + drag</strong> to pan</div>
                <div>• <strong>Mouse wheel</strong> to zoom in/out</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

ModelViewer.displayName = 'ModelViewer'

export default ModelViewer
