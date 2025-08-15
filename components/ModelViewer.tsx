'use client'

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import * as THREE from 'three'
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js'
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

import { Scan } from '@/types/scan'
import { Camera, Grid3X3, Upload } from 'lucide-react'

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
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [showControlsHint, setShowControlsHint] = useState(false)
  const isAnimatingRef = useRef(false)
  const gridRef = useRef<THREE.GridHelper | null>(null)
  const lightsRef = useRef<THREE.Group | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const currentModelRef = useRef<THREE.Object3D | null>(null)
  const animationRef = useRef<number | null>(null)

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

  // Entrance animation function - smooth camera approach from far away
  const playEntranceAnimation = () => {
    if (!controlsRef.current) return
    
    setIsAnimating(true)
    isAnimatingRef.current = true
    
    // Store initial target position
    const targetPosition = new THREE.Vector3(0, 2, 0)
    // Target rotation will be calculated to look at (0, 0, 0) from final position
    
    // Start from much higher position - top-down approach
    const startPosition = new THREE.Vector3(0, 20, 0) // Much higher up on Y axis
    const startRotation = new THREE.Euler(0, 0, 0, 'YXZ')
    
    // Set initial camera position
    controlsRef.current.position.copy(startPosition)
    controlsRef.current.rotation.copy(startRotation)
    controlsRef.current.update()
    
    // Create animation timeline - longer duration for more dramatic effect
    const startTime = Date.now()
    const animationDuration = 3500 // 3.5 seconds for slower, more cinematic movement
    
    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / animationDuration, 1)
      
      // Custom easing function for forward approach feeling
      // Start slow, accelerate in middle, slow down at end
      const easedProgress = progress < 0.5 
        ? 2 * progress * progress // Slow start
        : 1 - Math.pow(-2 * progress + 2, 2) / 2 // Slow finish
      
      // Interpolate position - forward movement
      const currentPosition = new THREE.Vector3()
      currentPosition.lerpVectors(startPosition, targetPosition, easedProgress)
      
      // Calculate rotation to always look at (0, 0, 0) from current position
      const lookAtTarget = new THREE.Vector3(0, 0, 0)
      const direction = new THREE.Vector3().subVectors(lookAtTarget, currentPosition).normalize()
      // Use lookAt for smooth animation that always points at center
      const currentRotation = new THREE.Euler()
      currentRotation.setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), direction))
      
      // Update controls
      if (controlsRef.current) {
        controlsRef.current.position.copy(currentPosition)
        controlsRef.current.rotation.copy(currentRotation)
        controlsRef.current.update()
      }
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        // Animation complete - ensure final position is exact and looking at (0, 0, 0)
        if (controlsRef.current) {
          controlsRef.current.position.copy(targetPosition)
          // Calculate final rotation to look at (0, 0, 0)
          const lookAtTarget = new THREE.Vector3(0, 0, 0)
          const direction = new THREE.Vector3().subVectors(lookAtTarget, targetPosition).normalize()
          // Convert to Euler angles that work with manual rotation system
          const yaw = Math.atan2(direction.x, direction.z)
          const pitch = Math.asin(-direction.y)
          const finalRotation = new THREE.Euler(pitch, yaw, 0, 'YXZ')
          controlsRef.current.rotation.copy(finalRotation)
          
          // Update controls and ensure smooth transition to manual control
          controlsRef.current.update()
          
          // Ensure camera maintains focus on (0, 0, 0) after animation
          // by updating the camera matrix directly without conflicting with controls
          if (cameraRef.current) {
            // Force camera to look at center one final time
            cameraRef.current.lookAt(0, 0, 0)
            // Update the camera's matrix to reflect the new orientation
            cameraRef.current.updateMatrixWorld()
            // Sync the controls rotation to match the camera's actual orientation
            controlsRef.current.rotation.copy(cameraRef.current.rotation)
          }
        }
        setIsAnimating(false)
        isAnimatingRef.current = false
        animationRef.current = null
        
        // Show controls hint briefly after animation
        setShowControlsHint(true)
        setTimeout(() => setShowControlsHint(false), 3000) // Hide after 3 seconds
      }
    }
    
    animate()
  }

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

  // File upload handling
  const handleFileUpload = (file: File) => {
    if (!file) return

    // Validate file type
    const validTypes = ['.obj', '.glb', '.gltf']
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
    
    if (!validTypes.includes(fileExtension)) {
      setUploadError(`Unsupported file type: ${fileExtension}. Please use OBJ, GLB, or GLTF files.`)
      return
    }

    // Validate file size (100MB limit for local files)
    if (file.size > 100 * 1024 * 1024) {
      setUploadError('File too large. Please use files smaller than 100MB.')
      return
    }

    setIsUploading(true)
    setUploadError(null)
    setIsLoading(true)

    // Create object URL for the file
    const objectURL = URL.createObjectURL(file)
    
    // Determine file format
    const isGLB = fileExtension === '.glb'
    const isGLTF = fileExtension === '.gltf'
    const isOBJ = fileExtension === '.obj'

    console.log('Loading local file:', { fileName: file.name, fileSize: file.size, fileExtension, isGLB, isGLTF, isOBJ })

    if (isGLB || isGLTF) {
      // Load GLB/GLTF from local file
      const gltfLoader = new GLTFLoader()
      gltfLoader.load(
        objectURL,
        (gltf: any) => {
          console.log('Local GLB/GLTF loaded successfully:', gltf)
          loadGLTFModel(gltf)
          // Don't set setIsUploading(false) here - let loadGLTFModel handle loading state
          // Clean up object URL
          URL.revokeObjectURL(objectURL)
        },
        (progress: any) => {
          // Loading progress
        },
        (error: any) => {
          console.error('Error loading local GLB/GLTF:', error)
          setError('Failed to load local GLB/GLTF model')
          setIsLoading(false)
          setIsUploading(false)
          setUploadError('Failed to load model file')
          URL.revokeObjectURL(objectURL)
        }
      )
    } else if (isOBJ) {
      // For OBJ files, we need to handle materials differently
      // For now, load without materials for simplicity
      const objLoader = new OBJLoader()
      objLoader.load(
        objectURL,
        (object: any) => {
          console.log('Local OBJ loaded successfully:', object)
          loadOBJModelFromObject(object)
          // Don't set setIsUploading(false) here - let loadOBJModelFromObject handle loading state
          URL.revokeObjectURL(objectURL)
        },
        (progress: any) => {
          // Loading progress
        },
        (error: any) => {
          console.error('Error loading local OBJ:', error)
          setError('Failed to load local OBJ model')
          setIsLoading(false)
          setIsUploading(false)
          setUploadError('Failed to load model file')
          URL.revokeObjectURL(objectURL)
        }
      )
    }
  }

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
    // Reset input value to allow re-uploading the same file
    if (event.target) {
      event.target.value = ''
    }
  }

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    
    const files = event.dataTransfer.files
    if (files.length > 0) {
      handleFileUpload(files[0])
    }
  }

  // Function to load OBJ model from object (for local file uploads)
  function loadOBJModelFromObject(object: any) {
    // Calculate model bounds BEFORE centering
    const box = new THREE.Box3().setFromObject(object)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    
    // Validate bounds to prevent NaN values
    if (isNaN(center.x) || isNaN(center.y) || isNaN(center.z) ||
        isNaN(size.x) || isNaN(size.y) || isNaN(size.z)) {
      console.error('Invalid local OBJ model bounds detected:', { center, size })
      setError('Local OBJ model has invalid geometry - cannot load')
      setIsLoading(false)
      return
    }
    
    // Validate size values
    if (size.x <= 0 || size.y <= 0 || size.z <= 0) {
      console.error('Local OBJ model has zero or negative dimensions:', size)
      setError('Local OBJ model has invalid dimensions - cannot load')
      setIsLoading(false)
      return
    }
    
    console.log('Local OBJ model bounds validation passed:', { center, size })
    
    // Center the model at origin
    object.position.sub(center)
    
    // Scale to fit in view (but don't make it too small)
    const maxDim = Math.max(size.x, size.y, size.z)
    const scale = Math.max(1.0, 5 / maxDim) // Ensure minimum scale of 1.0
    
    // Validate scale value
    if (isNaN(scale) || scale <= 0) {
      console.error('Invalid scale calculated for local OBJ:', { maxDim, scale })
      setError('Local OBJ model scaling failed - cannot load')
      setIsLoading(false)
      return
    }
    
    console.log('Local OBJ scale calculation:', { maxDim, scale })
    object.scale.setScalar(scale)
    
    // Reposition and resize the existing grid to match model
    if (gridRef.current && sceneRef.current) {
      // Remove old grid from scene
      sceneRef.current.remove(gridRef.current)
    }
    
    // Create new grid with appropriate size
    const gridSize = Math.max(size.x, size.z) * scale
    const newGridHelper = new THREE.GridHelper(gridSize, 20)
    newGridHelper.position.copy(object.position)
    
    // Update the grid reference
    gridRef.current = newGridHelper
    
    // Add to scene only if grid should be visible
    if (showGrid && sceneRef.current) {
      sceneRef.current.add(newGridHelper)
    }
    
    // Add to scene
    if (sceneRef.current) {
      sceneRef.current.add(object)
    }
    
    // Set loading to false AFTER the model is added to the scene
    setIsLoading(false)
    setIsUploading(false)

    // Calculate final model bounds AFTER scaling and positioning
    const finalBox = new THREE.Box3().setFromObject(object)
    const finalSize = finalBox.getSize(new THREE.Vector3())
    const finalCenter = finalBox.getCenter(new THREE.Vector3())
    
    // Debug logging
    console.log('Local OBJ model loaded:', {
      originalSize: size,
      scaledSize: finalSize,
      center: finalCenter,
      scale: scale
    })
    
    // Update camera controls with model size for movement speed
    if (controlsRef.current) {
      const maxDim = Math.max(size.x, size.y, size.z)
      controlsRef.current.setModelSize(maxDim)
    }
    
    // Apply the same camera positioning logic
    const maxSize = Math.max(finalSize.x, finalSize.y, finalSize.z)
    const originalMaxSize = Math.max(size.x, size.y, size.z)
    
    if (originalMaxSize < 3.0) {
      // Small model - position camera INSIDE
      const targetSize = originalMaxSize < 1.0 ? 5.0 : 3.0
      const newScale = targetSize / originalMaxSize
      
      // Validate newScale
      if (isNaN(newScale) || newScale <= 0) {
        console.error('Invalid newScale calculated for local OBJ:', { targetSize, originalMaxSize, newScale })
        setError('Local OBJ model rescaling failed - cannot load')
        setIsLoading(false)
        return
      }
      
      console.log('Rescaling local OBJ model:', { targetSize, originalMaxSize, newScale })
      object.scale.multiplyScalar(newScale)
      
      // Recalculate bounds after rescaling
      const newBox = new THREE.Box3().setFromObject(object)
      const newSize = newBox.getSize(new THREE.Vector3())
      const newCenter = newBox.getCenter(new THREE.Vector3())
      
      // Validate new bounds
      if (isNaN(newSize.x) || isNaN(newSize.y) || isNaN(newSize.z) ||
          isNaN(newCenter.x) || isNaN(newCenter.y) || isNaN(newCenter.z)) {
        console.error('Invalid bounds after local OBJ rescaling:', { newSize, newCenter })
        setError('Local OBJ model rescaling produced invalid geometry - cannot load')
        setIsLoading(false)
        return
      }
      
      console.log('Local OBJ model rescaled:', {
        newSize,
        newCenter,
        newScale,
        targetSize,
        originalMaxSize
      })
      
      // Position camera INSIDE the model bounds
      const finalMaxSize = Math.max(newSize.x, newSize.y, newSize.z)
      
      // Place camera at the center of the model
      if (cameraRef.current) {
        cameraRef.current.position.copy(newCenter)
        
        // Keep default FOV (no adjustment needed)
        cameraRef.current.fov = 75
        cameraRef.current.updateProjectionMatrix()
        
        // Keep camera at user-specified position (0, 2, 0) looking at (0, 0, 0)
        if (controlsRef.current) {
          controlsRef.current.position.set(0, 2, 0)
          controlsRef.current.rotation.set(0, 0, 0, 'YXZ')
          controlsRef.current.update() // Update camera position
          
          // Play entrance animation
          playEntranceAnimation()
        }
        
        console.log('Camera positioned INSIDE small local OBJ model:', {
          originalMaxSize,
          finalMaxSize,
          position: cameraRef.current.position.toArray(),
          target: newCenter.toArray(),
          fov: cameraRef.current.fov
        })
      }
    } else {
      // Large model - use traditional outside positioning
      const optimalDistance = maxSize * 2.0
      
      // Position camera to show entire model
      if (cameraRef.current) {
        cameraRef.current.position.set(
          finalCenter.x + optimalDistance,
          finalCenter.y + optimalDistance * 0.8,
          finalCenter.z + optimalDistance
        )
        cameraRef.current.lookAt(finalCenter)
        
        // Keep camera at user-specified position (0, 2, 0) looking at (0, 0, 0)
        if (controlsRef.current) {
          controlsRef.current.position.set(0, 2, 0)
          controlsRef.current.rotation.set(0, 0, 0, 'YXZ')
          controlsRef.current.update() // Update camera position
          
          // Play entrance animation
          playEntranceAnimation()
        }
        
        console.log('Camera positioned for large local OBJ model:', {
          originalMaxSize,
          maxSize,
          optimalDistance,
          position: cameraRef.current.position.toArray(),
          target: finalCenter.toArray()
        })
      }
    }
    
    console.log('Final local OBJ camera position:', {
      position: cameraRef.current?.position.toArray(),
      target: finalCenter.toArray()
    })
    
    // Update camera projection
    if (cameraRef.current) {
      cameraRef.current.updateProjectionMatrix()
    }
    
    // Update controls
    if (controlsRef.current) {
      controlsRef.current.update()
    }
  }

  // Function to load GLTF model from object (for local file uploads)
  function loadGLTFModel(gltf: any) {
    const object = gltf.scene
    
    // Calculate model bounds BEFORE centering
    const box = new THREE.Box3().setFromObject(object)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    
    // Validate bounds to prevent NaN values
    if (isNaN(center.x) || isNaN(center.y) || isNaN(center.z) ||
        isNaN(size.x) || isNaN(size.y) || isNaN(size.z)) {
      console.error('Invalid GLTF model bounds detected:', { center, size })
      setError('GLTF model has invalid geometry - cannot load')
      setIsLoading(false)
      return
    }
    
    // Validate size values
    if (size.x <= 0 || size.y <= 0 || size.z <= 0) {
      console.error('GLTF model has zero or negative dimensions:', size)
      setError('GLTF model has invalid dimensions - cannot load')
      setIsLoading(false)
      return
    }
    
    console.log('GLTF model bounds validation passed:', { center, size })
    
    // Center the model at origin
    object.position.sub(center)
    
    // Scale to fit in view (but don't make it too small)
    const maxDim = Math.max(size.x, size.y, size.z)
    const scale = Math.max(1.0, 5 / maxDim) // Ensure minimum scale of 1.0
    
    // Validate scale value
    if (isNaN(scale) || scale <= 0) {
      console.error('Invalid GLTF scale calculated:', { maxDim, scale })
      setError('GLTF model scaling failed - cannot load')
      setIsLoading(false)
      return
    }
    
    console.log('GLTF scale calculation:', { maxDim, scale })
    object.scale.setScalar(scale)
    
    // Reposition and resize the existing grid to match model
    if (gridRef.current) {
      // Remove old grid from scene
      sceneRef.current?.remove(gridRef.current)
    }
    
    // Create new grid with appropriate size
    const gridSize = Math.max(size.x, size.z) * scale
    const newGridHelper = new THREE.GridHelper(gridSize, 20)
    newGridHelper.position.copy(object.position)
    
    // Update the grid reference
    gridRef.current = newGridHelper
    
    // Add to scene only if grid should be visible
    if (showGrid && sceneRef.current) {
      sceneRef.current.add(newGridHelper)
    }
    
    // Add to scene
    if (sceneRef.current) {
      sceneRef.current.add(object)
    }
    
    // Set loading to false AFTER the model is added to the scene
    setIsLoading(false)
    setIsUploading(false)
    
    // Calculate final model bounds AFTER scaling and positioning
    const finalBox = new THREE.Box3().setFromObject(object)
    const finalSize = finalBox.getSize(new THREE.Vector3())
    const finalCenter = finalBox.getCenter(new THREE.Vector3())
    
    // Debug logging
    console.log('GLTF model loaded:', {
      originalSize: size,
      scaledSize: finalSize,
      center: finalCenter,
      scale: scale
    })
    
    // Update camera controls with model size for movement speed
    if (controlsRef.current) {
      const maxDim = Math.max(size.x, size.y, size.z)
      controlsRef.current.setModelSize(maxDim)
    }
    
    // More aggressive scaling to ensure model is visible
    const maxSize = Math.max(finalSize.x, finalSize.y, finalSize.z)
    const originalMaxSize = Math.max(size.x, size.y, size.z) // Check original size, not scaled
    
    if (originalMaxSize < 3.0) { // Check original size, not scaled size
      // If model is too small, scale it up more aggressively
      const targetSize = originalMaxSize < 1.0 ? 5.0 : 3.0 // Very small models get scaled to 5.0
      const newScale = targetSize / originalMaxSize
      
      // Validate newScale
      if (isNaN(newScale) || newScale <= 0) {
        console.error('Invalid GLTF newScale calculated:', { targetSize, originalMaxSize, newScale })
        setError('GLTF model rescaling failed - cannot load')
        setIsLoading(false)
        return
      }
      
      console.log('GLTF model rescaling:', { targetSize, originalMaxSize, newScale })
      object.scale.multiplyScalar(newScale)
      
      // Recalculate bounds after rescaling
      const newBox = new THREE.Box3().setFromObject(object)
      const newSize = newBox.getSize(new THREE.Vector3())
      const newCenter = newBox.getCenter(new THREE.Vector3())
      
      // Validate new bounds
      if (isNaN(newSize.x) || isNaN(newSize.y) || isNaN(newSize.z) ||
          isNaN(newCenter.x) || isNaN(newCenter.y) || isNaN(newCenter.z)) {
        console.error('Invalid GLTF bounds after rescaling:', { newSize, newCenter })
        setError('GLTF model rescaling failed - cannot load')
        setIsLoading(false)
        return
      }
      
      console.log('GLTF model rescaled:', {
        newSize,
        newCenter,
        newScale,
        targetSize,
        originalMaxSize
      })
      
      // Position camera INSIDE the model bounds
      const finalMaxSize = Math.max(newSize.x, newSize.y, newSize.z)
      
      // Place camera at the center of the model
      if (cameraRef.current) {
        cameraRef.current.position.copy(newCenter)
        
        // Keep default FOV (no adjustment needed)
        cameraRef.current.fov = 75
        cameraRef.current.updateProjectionMatrix()
        
        // Update OrbitControls - camera stays at center, controls rotate around it
        if (controlsRef.current) {
          controlsRef.current.target.copy(newCenter)
          controlsRef.current.distance = finalMaxSize * 0.4 // Set initial distance
          controlsRef.current.update() // Update camera position
        }
        
        console.log('Camera positioned INSIDE small GLTF model:', {
          originalMaxSize,
          finalMaxSize,
          position: cameraRef.current.position.toArray(),
          target: newCenter.toArray(),
          fov: cameraRef.current.fov
        })
      }
    } else {
      // For larger models, use traditional outside positioning
      const optimalDistance = maxSize * 2.0 // Reduced from 4.0 to 2.0
      
      // Position camera to show entire model
      if (cameraRef.current) {
        cameraRef.current.position.set(
          finalCenter.x + optimalDistance,
          finalCenter.y + optimalDistance * 0.8,
          finalCenter.z + optimalDistance
        )
        cameraRef.current.lookAt(finalCenter)
        
        // Update custom controls - position camera at optimal distance
        if (controlsRef.current) {
          controlsRef.current.position.set(
            finalCenter.x + optimalDistance,
            finalCenter.y + optimalDistance * 0.8,
            finalCenter.z + optimalDistance
          )
          // Look at the center
          controlsRef.current.rotation.set(
            Math.atan2(optimalDistance * 0.8, optimalDistance),
            Math.atan2(optimalDistance, optimalDistance),
            0,
            'YXZ'
          )
          controlsRef.current.update()
        }
        
        console.log('Camera positioned for large GLTF model:', {
          originalMaxSize,
          maxSize,
          optimalDistance,
          position: cameraRef.current.position.toArray(),
          target: finalCenter.toArray()
        })
      }
    }
    
    console.log('Final GLTF camera position:', {
      position: cameraRef.current?.position.toArray(),
      target: finalCenter.toArray()
    })
    
    // Update camera projection
    if (cameraRef.current) {
      cameraRef.current.updateProjectionMatrix()
    }
    
    // Update controls
    if (controlsRef.current) {
      controlsRef.current.update()
    }
  }

  useEffect(() => {
    if (!mountRef.current) return

    // Set loading state when scan changes
    setIsLoading(true)
    setError(null)

    // Clear previous scene content
    if (sceneRef.current) {
      // Remove all objects except lights and grid
      const objectsToRemove: THREE.Object3D[] = []
      sceneRef.current.traverse((child) => {
        if (child.type === 'Group' && child !== lightsRef.current && child !== gridRef.current) {
          objectsToRemove.push(child)
        }
      })
      objectsToRemove.forEach(obj => sceneRef.current!.remove(obj))
    }

    // Scene setup
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf8f9fa) // Lighter background for better contrast
    sceneRef.current = scene

    // Camera setup - UNLIMITED zoom range
    const camera = new THREE.PerspectiveCamera(
      75,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.0001,  // Near clipping plane - allows zooming VERY close
      1000000   // Far clipping plane - allows zooming VERY far
    )
    camera.position.set(0, 1, 0)
    camera.lookAt(0, 0, 1)
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

    // Free camera controls for independent 3D movement
    const controls = {
      position: new THREE.Vector3(0, 1, 0),
      rotation: new THREE.Euler(0, -Math.PI / 2, 0, 'YXZ'), // Yaw, Pitch, Roll - look forward and down
      modelSize: 1.0, // Default model size, will be updated when model loads
      
      // Move camera forward/backward in view direction
      moveForward: (distance: number) => {
        // Calculate forward direction from current rotation
        const forward = new THREE.Vector3(0, 0, -1)
        forward.applyEuler(controls.rotation)
        forward.multiplyScalar(distance)
        
        // Move camera position
        controls.position.add(forward)
        controls.update()
      },
      
      // Pan camera left/right/up/down in view direction
      pan: (deltaX: number, deltaY: number) => {
        // Calculate right and up vectors in view space
        const forward = new THREE.Vector3(0, 0, -1)
        forward.applyEuler(controls.rotation)
        
        const right = new THREE.Vector3()
        right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize()
        
        const up = new THREE.Vector3()
        up.crossVectors(right, forward).normalize()
        
        // Calculate pan speed based on model size - bigger models = faster panning
        const basePanSpeed = 0.005  // Increased from 0.001 for faster panning
        const sizeMultiplier = Math.max(0.1, controls.modelSize)
        const panSpeed = basePanSpeed * sizeMultiplier
        
        // Apply panning
        const panX = right.clone().multiplyScalar(-deltaX * panSpeed)
        const panY = up.clone().multiplyScalar(-deltaY * panSpeed)
        
        controls.position.add(panX)
        controls.position.add(panY)
        
        controls.update()
      },
      
      // Rotate camera view (yaw and pitch)
      rotate: (deltaX: number, deltaY: number) => {
        // Yaw rotation (left/right)
        controls.rotation.y -= deltaX * 0.01
        
        // Pitch rotation (up/down) with limits to prevent flipping
        controls.rotation.x -= deltaY * 0.01
        controls.rotation.x = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, controls.rotation.x))
        
        controls.update()
      },
      
      // Update model size for speed calculations
      setModelSize: (size: number) => {
        controls.modelSize = Math.max(0.1, size)
        console.log('Camera controls updated with model size:', controls.modelSize)
      },
      
      update: () => {
        // Apply position and rotation to camera
        camera.position.copy(controls.position)
        camera.rotation.copy(controls.rotation)
        camera.updateMatrixWorld()
      }
    }
    
    // Store controls reference
    controlsRef.current = controls

    // Mouse event handling
    let isMouseDown = false
    let mouseButton = 0
    let lastMouseX = 0
    let lastMouseY = 0

    const onMouseDown = (event: MouseEvent) => {
      // Disable controls during entrance animation
      if (isAnimatingRef.current) return
      
      isMouseDown = true
      mouseButton = event.button
      lastMouseX = event.clientX
      lastMouseY = event.clientY
    }

    const onMouseMove = (event: MouseEvent) => {
      // Disable controls during entrance animation
      if (isAnimatingRef.current) return
      
      if (!isMouseDown) return

      const deltaX = event.clientX - lastMouseX
      const deltaY = event.clientY - lastMouseY

      if (mouseButton === 0) { // Left click - rotate view
        controls.rotate(deltaX, deltaY)
      } else if (mouseButton === 2) { // Right click - pan in view direction
        controls.pan(deltaX, deltaY)
      }

      lastMouseX = event.clientX
      lastMouseY = event.clientY
    }

    const onMouseUp = () => {
      isMouseDown = false
    }

    const onWheel = (event: WheelEvent) => {
      // Disable controls during entrance animation
      if (isAnimatingRef.current) return
      
      // Zoom in = move forward, Zoom out = move backward in view direction
      const baseZoomSpeed = 0.03  // Decreased from 0.1 for slower zooming
      const sizeMultiplier = Math.max(0.1, controls.modelSize)
      const zoomSpeed = baseZoomSpeed * sizeMultiplier
      
      const zoomDirection = event.deltaY > 0 ? -1 : 1 // Negative deltaY = zoom in (forward)
      const zoomDistance = zoomDirection * zoomSpeed * Math.max(0.1, controls.position.length())
      
      controls.moveForward(zoomDistance)
    }

    // Add event listeners
    renderer.domElement.addEventListener('mousedown', onMouseDown)
    renderer.domElement.addEventListener('mousemove', onMouseMove)
    renderer.domElement.addEventListener('mouseup', onMouseUp)
    renderer.domElement.addEventListener('wheel', onWheel)
    renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault()) // Prevent right-click menu

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

    // Determine file format and load accordingly
    const fileExtension = scan.fileFormat || scan.modelPath.split('.').pop()?.toLowerCase()
    const isGLB = fileExtension === 'glb'
    const isGLTF = fileExtension === 'gltf'
    const isOBJ = fileExtension === 'obj'

    console.log('Detected file format:', { fileExtension, isGLB, isGLTF, isOBJ })

    if (isGLB || isGLTF) {
      const gltfLoader = new GLTFLoader()
      gltfLoader.load(
        scan.modelPath,
        (gltf) => {
          loadGLTFModel(gltf)
          // Don't set isLoading to false here - let loadGLTFModel handle it after rendering
        },
        (progress) => {
          // Progress callback
        },
        (error) => {
          setError('Failed to load GLB/GLTF model')
          setIsLoading(false)
        }
      )
    } else if (isOBJ) {
      // Load OBJ model
      if (scan.hasMtl) {
        // Load MTL first, then OBJ
        const mtlLoader = new MTLLoader()
        
        // For server models, construct the correct MTL path
        if (scan.modelPath.startsWith('/scans/')) {
          // Server model - MTL is in the same folder as OBJ
          const folderPath = scan.modelPath.substring(0, scan.modelPath.lastIndexOf('/'))
          
          // Try multiple common MTL filenames since naming conventions vary
          // Try multiple common MTL filenames since naming conventions vary
          // The living-room scan has 'model.mtl' but 'room.obj'
          const possibleMtlFiles = ['model.mtl', 'materials.mtl', 'textures.mtl']
          let mtlPath = ''
          
          // For now, just try 'model.mtl' first since that's what living-room has
          mtlPath = `${folderPath}/model.mtl`
          
          console.log('Loading MTL file from:', mtlPath, 'for OBJ file:', scan.modelPath)
          
          mtlLoader.load(
            mtlPath,
            (materials) => {
              materials.preload()
              const objLoader = new OBJLoader()
              objLoader.setMaterials(materials)
              objLoader.load(
                scan.modelPath,
                (object) => {
                  loadOBJModelFromObject(object)
                  // Don't set isLoading to false here - let loadOBJModelFromObject handle it after rendering
                },
                (progress) => {
                  // Progress callback
                },
                (error) => {
                  const errorMessage = error instanceof Error ? error.message : 'Unknown error'
                  setError(`Failed to load OBJ model: ${errorMessage}`)
                  setIsLoading(false)
                }
              )
            },
            (progress) => {
              // Progress callback
            },
            (error) => {
              console.warn('MTL loading failed, loading OBJ without materials:', error)
              console.log('Attempting to load OBJ without materials as fallback')
              // Continue without materials
              const objLoader = new OBJLoader()
              objLoader.load(
                scan.modelPath,
                (object) => {
                  console.log('OBJ loaded successfully without materials')
                  loadOBJModelFromObject(object)
                  // Don't set isLoading to false here - let loadOBJModelFromObject handle it after rendering
                },
                (progress) => {
                  // Progress callback
                },
                (error) => {
                  console.error('OBJ loading failed even without materials:', error)
                  const errorMessage = error instanceof Error ? error.message : 'Unknown error'
                  setError(`Failed to load OBJ model: ${errorMessage}`)
                  setIsLoading(false)
                }
              )
            }
          )
        } else {
          // Local uploaded model - no MTL support for now
          console.log('Local uploaded OBJ model - loading without materials')
          const objLoader = new OBJLoader()
          objLoader.load(
            scan.modelPath,
            (object) => {
              loadOBJModelFromObject(object)
              // Don't set isLoading to false here - let loadOBJModelFromObject handle it after rendering
            },
            (progress) => {
              // Progress callback
            },
            (error) => {
              setError('Failed to load OBJ model')
              setIsLoading(false)
            }
          )
        }
      } else {
        // Load OBJ without MTL
        const objLoader = new OBJLoader()
        objLoader.load(
          scan.modelPath,
          (object) => {
            loadOBJModelFromObject(object)
            // Don't set isLoading to false here - let loadOBJModelFromObject handle it after rendering
          },
          (progress) => {
            // Progress callback
          },
          (error) => {
            setError('Failed to load OBJ model')
            setIsLoading(false)
          }
        )
      }
    } else {
      setError(`Unsupported file format: ${fileExtension}`)
      setIsLoading(false)
    }

    function loadGLTFModel(gltf: any) {
      const object = gltf.scene
      
      // Calculate model bounds BEFORE centering
      const box = new THREE.Box3().setFromObject(object)
      const center = box.getCenter(new THREE.Vector3())
      const size = box.getSize(new THREE.Vector3())
      
      // Validate bounds to prevent NaN values
      if (isNaN(center.x) || isNaN(center.y) || isNaN(center.z) ||
          isNaN(size.x) || isNaN(size.y) || isNaN(size.z)) {
        console.error('Invalid GLB/GLTF model bounds detected:', { center, size })
        setError('GLB/GLTF model has invalid geometry - cannot load')
        setIsLoading(false)
        return
      }
      
      // Validate size values
      if (size.x <= 0 || size.y <= 0 || size.z <= 0) {
        console.error('GLB/GLTF model has zero or negative dimensions:', size)
        setError('GLB/GLTF model has invalid dimensions - cannot load')
        setIsLoading(false)
        return
      }
      
      console.log('GLB/GLTF model bounds validation passed:', { center, size })
      
      // Center the model at origin
      object.position.sub(center)
      
      // Scale to fit in view (but don't make it too small)
      const maxDim = Math.max(size.x, size.y, size.z)
      const scale = Math.max(1.0, 5 / maxDim) // Ensure minimum scale of 1.0
      
      // Validate scale value
      if (isNaN(scale) || scale <= 0) {
        console.error('Invalid scale calculated for GLB/GLTF:', { maxDim, scale })
        setError('GLB/GLTF model scaling failed - cannot load')
        setIsLoading(false)
        return
      }
      
      console.log('GLB/GLTF scale calculation:', { maxDim, scale })
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
      console.log('GLB/GLTF model loaded:', {
        originalSize: size,
        scaledSize: finalSize,
        center: finalCenter,
        scale: scale
      })
      
      // Update camera controls with model size for movement speed
      if (controlsRef.current) {
        const maxDim = Math.max(size.x, size.y, size.z)
        controlsRef.current.setModelSize(maxDim)
      }
      
      // Apply the same camera positioning logic as OBJ models
      const maxSize = Math.max(finalSize.x, finalSize.y, finalSize.z)
      const originalMaxSize = Math.max(size.x, size.y, size.z) // Check original size, not scaled
      
      if (originalMaxSize < 3.0) { // Check original size, not scaled size
        // If model is too small, scale it up more aggressively
        const targetSize = originalMaxSize < 1.0 ? 5.0 : 3.0 // Very small models get scaled to 5.0
        const newScale = targetSize / originalMaxSize
        
        // Validate newScale
        if (isNaN(newScale) || newScale <= 0) {
          console.error('Invalid newScale calculated for GLB/GLTF:', { targetSize, originalMaxSize, newScale })
          setError('GLB/GLTF model rescaling failed - cannot load')
          setIsLoading(false)
          return
        }
        
        console.log('Rescaling GLB/GLTF model:', { targetSize, originalMaxSize, newScale })
        object.scale.multiplyScalar(newScale)
        
        // Recalculate bounds after rescaling
        const newBox = new THREE.Box3().setFromObject(object)
        const newSize = newBox.getSize(new THREE.Vector3())
        const newCenter = newBox.getCenter(new THREE.Vector3())
        
        // Validate new bounds
        if (isNaN(newSize.x) || isNaN(newSize.y) || isNaN(newSize.z) ||
            isNaN(newCenter.x) || isNaN(newCenter.y) || isNaN(newCenter.z)) {
          console.error('Invalid bounds after GLB/GLTF rescaling:', { newSize, newCenter })
          setError('GLB/GLTF model rescaling produced invalid geometry - cannot load')
          setIsLoading(false)
          return
        }
        
        console.log('GLB/GLTF model rescaled:', {
          newSize,
          newCenter,
          newScale,
          targetSize,
          originalMaxSize
        })
        
        // Position camera INSIDE the model bounds
        const finalMaxSize = Math.max(newSize.x, newSize.y, newSize.z)
        
        // Place camera at the center of the model
        camera.position.copy(newCenter)
        
        // Keep default FOV (no adjustment needed)
        camera.fov = 75
        camera.updateProjectionMatrix()
        
        // Keep camera at user-specified position (0, 2, 0) looking at (0, 0, 0)
        controls.position.set(0, 2, 0)
        controls.rotation.set(0, 0, 0, 'YXZ')
        controls.update() // Update camera position
        
        // Play entrance animation
        playEntranceAnimation()
        
        console.log('Camera positioned INSIDE small GLB/GLTF model:', {
          originalMaxSize,
          finalMaxSize,
          position: camera.position.toArray(),
          target: finalCenter.toArray(),
          fov: camera.fov
        })
      } else {
        // For larger models, keep camera at user-specified position
        // Don't reposition the camera - let user control it
        
        // Keep camera at user-specified position (0, 2, 0) looking at (0, 0, 0)
        controls.position.set(0, 2, 0)
        controls.rotation.set(0, 0, 0, 'YXZ')
        controls.update() // Update camera position
        
        // Play entrance animation
        playEntranceAnimation()
        
        console.log('Camera positioned for large GLB/GLTF model:', {
          originalMaxSize,
          maxSize,
          position: camera.position.toArray(),
          target: finalCenter.toArray()
        })
      }
      
      console.log('Final GLB/GLTF camera position:', {
        position: camera.position.toArray(),
        target: finalCenter.toArray()
      })
      
      // Update camera projection
      camera.updateProjectionMatrix()
      
      // Update controls
      controls.update()
    }
 
     function loadOBJModel(object: any) {
      // Calculate model bounds BEFORE centering
      const box = new THREE.Box3().setFromObject(object)
      const center = box.getCenter(new THREE.Vector3())
      const size = box.getSize(new THREE.Vector3())
      
      // Validate bounds to prevent NaN values
      if (isNaN(center.x) || isNaN(center.y) || isNaN(center.z) ||
          isNaN(size.x) || isNaN(size.y) || isNaN(size.z)) {
        console.error('Invalid model bounds detected:', { center, size })
        setError('Model has invalid geometry - cannot load')
        setIsLoading(false)
        return
      }
      
      // Validate size values
      if (size.x <= 0 || size.y <= 0 || size.z <= 0) {
        console.error('Model has zero or negative dimensions:', size)
        setError('Model has invalid dimensions - cannot load')
        setIsLoading(false)
        return
      }
      
      console.log('Model bounds validation passed:', { center, size })
      
      // Center the model at origin
      object.position.sub(center)
      
      // Scale to fit in view (but don't make it too small)
      const maxDim = Math.max(size.x, size.y, size.z)
      const scale = Math.max(1.0, 5 / maxDim) // Ensure minimum scale of 1.0
      
      // Validate scale value
      if (isNaN(scale) || scale <= 0) {
        console.error('Invalid scale calculated:', { maxDim, scale })
        setError('Model scaling failed - cannot load')
        setIsLoading(false)
        return
      }
      
      console.log('Scale calculation:', { maxDim, scale })
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
      
      // Update camera controls with model size for movement speed
      if (controlsRef.current) {
        const maxDim = Math.max(size.x, size.y, size.z)
        controlsRef.current.setModelSize(maxDim)
      }
      
      // More aggressive scaling to ensure model is visible
      const maxSize = Math.max(finalSize.x, finalSize.y, finalSize.z)
      const originalMaxSize = Math.max(size.x, size.y, size.z) // Check original size, not scaled
      
      if (originalMaxSize < 3.0) { // Check original size, not scaled size
        // If model is too small, scale it up more aggressively
        const targetSize = originalMaxSize < 1.0 ? 5.0 : 3.0 // Very small models get scaled to 5.0
        const newScale = targetSize / originalMaxSize
        
        // Validate newScale
        if (isNaN(newScale) || newScale <= 0) {
          console.error('Invalid newScale calculated:', { targetSize, originalMaxSize, newScale })
          setError('Model rescaling failed - cannot load')
          setIsLoading(false)
          return
        }
        
        console.log('Rescaling model:', { targetSize, originalMaxSize, newScale })
        object.scale.multiplyScalar(newScale)
        
        // Recalculate bounds after rescaling
        const newBox = new THREE.Box3().setFromObject(object)
        const newSize = newBox.getSize(new THREE.Vector3())
        const newCenter = newBox.getCenter(new THREE.Vector3())
        
        // Validate new bounds
        if (isNaN(newSize.x) || isNaN(newSize.y) || isNaN(newSize.z) ||
            isNaN(newCenter.x) || isNaN(newCenter.y) || isNaN(newCenter.z)) {
          console.error('Invalid bounds after rescaling:', { newSize, newCenter })
          setError('Model rescaling produced invalid geometry - cannot load')
          setIsLoading(false)
          return
        }
        
        console.log('Model rescaled:', {
          newSize,
          newCenter,
          newScale,
          targetSize,
          originalMaxSize
        })
        
        // Position camera INSIDE the model bounds
        const finalMaxSize = Math.max(newSize.x, newSize.y, newSize.z)
        
        // Place camera at the center of the model
        camera.position.copy(newCenter)
        
        // Keep default FOV (no adjustment needed)
        camera.fov = 75
        camera.updateProjectionMatrix()
        
        // Keep camera at user-specified position (0, 2, 0) looking at (0, 0, 0)
        controls.position.set(0, 2, 0)
        controls.rotation.set(0, 0, 0, 'YXZ')
        controls.update() // Update camera position
        
        // Play entrance animation
        playEntranceAnimation()
        
        console.log('Camera positioned INSIDE small model:', {
          originalMaxSize,
          finalMaxSize,
          position: camera.position.toArray(),
          target: newCenter.toArray(),
          fov: camera.fov
        })
      } else {
        // For larger models, keep camera at user-specified position
        // Don't reposition the camera - let user control it
        
        // Keep camera at user-specified position (0, 2, 0) looking at (0, 0, 0)
        controls.position.set(0, 2, 0)
        controls.rotation.set(0, 0, 0, 'YXZ')
        controls.update() // Update camera position
        
        // Play entrance animation
        playEntranceAnimation()
        
        console.log('Camera positioned for large model:', {
          originalMaxSize,
          maxSize,
          position: camera.position.toArray(),
          target: finalCenter.toArray()
        })
      }
      
      console.log('Final camera position:', {
        position: camera.position.toArray(),
        target: finalCenter.toArray()
      })
      
      // Update camera projection
      camera.updateProjectionMatrix()
      
      // Update controls
      controls.update()
    }



    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate)
      
      // Render the scene
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
      
      // Cancel any ongoing animation
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
      
      // Remove custom event listeners
      if (renderer.domElement) {
        renderer.domElement.removeEventListener('mousedown', onMouseDown)
        renderer.domElement.removeEventListener('mousemove', onMouseMove)
        renderer.domElement.removeEventListener('mouseup', onMouseUp)
        renderer.domElement.removeEventListener('wheel', onWheel)
        renderer.domElement.removeEventListener('contextmenu', (e) => e.preventDefault())
      }
      
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
        Left click + drag to rotate • Right click + drag to pan • Scroll up to move forward • Scroll down to move backward
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
                       
                       // Check if this is a small model (original size < 3.0)
                       // We need to estimate the original size from the current scaled size
                       const estimatedOriginalSize = maxSize / 6.0 // Rough estimate based on typical scaling
                       
                       if (estimatedOriginalSize < 3.0) {
                         // Small model - position camera INSIDE
                         camera.position.copy(center)
                         
                         // Adjust FOV for better visibility from inside
                         const aspectRatio = mountRef.current!.clientWidth / mountRef.current!.clientHeight
                         const requiredFOV = Math.atan2(maxSize / 2, maxSize * 0.1) * 2 * (180 / Math.PI)
                         camera.fov = Math.min(requiredFOV, 120)
                         camera.updateProjectionMatrix()
                         
                         // Keep camera at user-specified position (0, 2, 0) looking at (0, 0, 0)
                         controls.position.set(0, 2, 0)
                         controls.rotation.set(0, 0, 0, 'YXZ')
                         controls.update() // Update camera position
                         
                         // Play entrance animation
                         playEntranceAnimation()
                         
                         console.log('Reset camera INSIDE small model:', {
                           estimatedOriginalSize,
                           maxSize,
                           position: camera.position.toArray(),
                           target: center.toArray(),
                           fov: camera.fov
                         })
                       } else {
                         // Large model - use traditional outside positioning
                         const cameraDistance = maxSize * 2.0
                         
                         camera.position.set(
                           center.x + cameraDistance,
                           center.y + cameraDistance * 0.8,
                           center.z + cameraDistance
                         )
                         camera.lookAt(center)
                         camera.updateProjectionMatrix()
                         
                         // Keep camera at user-specified position (0, 2, 0) looking at (0, 0, 0)
                         controls.position.set(0, 2, 0)
                         controls.rotation.set(0, 0, 0, 'YXZ')
                         controls.update() // Update camera position
                         
                         // Play entrance animation
                         playEntranceAnimation()
                         
                         console.log('Reset camera for large model:', {
                           maxSize,
                           cameraDistance,
                           position: camera.position.toArray(),
                           target: center.toArray()
                         })
                       }
                       
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
