'use client'

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import * as THREE from 'three'
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js'
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js'
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
    scene.add(gridHelper)

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
          // Calculate model bounds
          const box = new THREE.Box3().setFromObject(object)
          const center = box.getCenter(new THREE.Vector3())
          const size = box.getSize(new THREE.Vector3())
          
          // Center the model at origin
          object.position.sub(center)
          
          // Reposition grid to match model center
          gridHelper.position.copy(object.position)
          
          // Scale to fit in view
          const maxDim = Math.max(size.x, size.y, size.z)
          const scale = 5 / maxDim
          object.scale.setScalar(scale)
          
          // Adjust grid size based on model
          const gridSize = Math.max(size.x, size.z) * scale
          scene.remove(gridHelper)
          const newGridHelper = new THREE.GridHelper(gridSize, 20)
          newGridHelper.position.copy(object.position)
          scene.add(newGridHelper)
          
          // Add to scene
          scene.add(object)
          setIsLoading(false)

          // Auto-rotate camera to show model
          camera.position.set(5 * scale, 5 * scale, 5 * scale)
          camera.lookAt(0, 0, 0)
          
          // Ensure camera doesn't get too close or too far
          const minDistance = maxDim * scale * 0.5
          const maxDistance = maxDim * scale * 3
          camera.position.clampLength(minDistance, maxDistance)
          
          // Update camera controls
          camera.updateProjectionMatrix()
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

    // Mouse controls for rotation
    let isMouseDown = false
    let mouseX = 0
    let mouseY = 0

    const onMouseDown = (event: MouseEvent) => {
      isMouseDown = true
      mouseX = event.clientX
      mouseY = event.clientY
    }

    const onMouseMove = (event: MouseEvent) => {
      if (!isMouseDown) return

      const deltaX = event.clientX - mouseX
      const deltaY = event.clientY - mouseY

      if (camera) {
        const spherical = new THREE.Spherical()
        spherical.setFromVector3(camera.position)
        spherical.theta -= deltaX * 0.01
        spherical.phi += deltaY * 0.01
        spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi))
        
        camera.position.setFromSpherical(spherical)
        camera.lookAt(0, 0, 0)
      }

      mouseX = event.clientX
      mouseY = event.clientY
    }

    const onMouseUp = () => {
      isMouseDown = false
    }

    const onWheel = (event: WheelEvent) => {
      if (!camera) return
      
      const zoomSpeed = 0.1
      const distance = camera.position.length()
      const newDistance = distance + event.deltaY * zoomSpeed
      
      if (newDistance > 1 && newDistance < 20) {
        camera.position.normalize().multiplyScalar(newDistance)
      }
    }

    renderer.domElement.addEventListener('mousedown', onMouseDown)
    renderer.domElement.addEventListener('mousemove', onMouseMove)
    renderer.domElement.addEventListener('mouseup', onMouseUp)
    renderer.domElement.addEventListener('wheel', onWheel)

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
      renderer.domElement.removeEventListener('mousedown', onMouseDown)
      renderer.domElement.removeEventListener('mousemove', onMouseMove)
      renderer.domElement.removeEventListener('mouseup', onMouseUp)
      renderer.domElement.removeEventListener('wheel', onWheel)
      
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
        Click + drag to rotate • Scroll to zoom
      </div>

      {/* Grid Toggle Button */}
      <div className="absolute top-2 right-32">
        <button
          onClick={() => setShowGrid(!showGrid)}
          className={`p-2 rounded-lg shadow-lg transition-all ${
            showGrid 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-gray-600 text-white hover:bg-gray-700'
          }`}
          title={showGrid ? 'Hide Grid' : 'Show Grid'}
        >
          <Grid3X3 className="h-5 w-5" />
        </button>
      </div>

      {/* Lighting Controls */}
      <div className="absolute top-2 right-2 bg-white bg-opacity-90 rounded-lg shadow-lg p-2">
        <div className="text-xs text-gray-600 mb-1 font-medium">Lighting</div>
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
  )
})
