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
  const gridRef = useRef<THREE.GridHelper | null>(null)

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

  // Toggle grid visibility
  const toggleGrid = () => {
    if (gridRef.current && sceneRef.current) {
      if (showGrid) {
        sceneRef.current.remove(gridRef.current)
      } else {
        sceneRef.current.add(gridRef.current)
      }
      setShowGrid(!showGrid)
    }
  }

  useEffect(() => {
    if (!mountRef.current) return

    // Scene setup
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf0f0f0)
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
    rendererRef.current = renderer

    mountRef.current.appendChild(renderer.domElement)

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(10, 10, 5)
    directionalLight.castShadow = true
    scene.add(directionalLight)

    // Grid helper - will be repositioned after model loads
    const gridHelper = new THREE.GridHelper(10, 10)
    gridRef.current = gridHelper
    if (showGrid) {
      scene.add(gridHelper)
    }

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
          
          // Scale to fit in view
          const maxDim = Math.max(size.x, size.y, size.z)
          const scale = 5 / maxDim
          object.scale.setScalar(scale)
          
          // Reposition and resize the existing grid to match model
          if (gridRef.current) {
            // Remove old grid from scene
            scene.remove(gridRef.current)
            
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
          }
          
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
  }, [scan, showGrid])

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

      {/* Grid Toggle Button */}
      <div className="absolute top-4 right-4">
        <button
          onClick={toggleGrid}
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
    </div>
  )
})
