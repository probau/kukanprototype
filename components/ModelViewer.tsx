'use client'

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import * as THREE from 'three'
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js'
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
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
  const gridRef = useRef<THREE.GridHelper | null>(null)
  const lightsRef = useRef<THREE.Group | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
          setIsUploading(false)
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
          setIsUploading(false)
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
    setIsLoading(false)

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
        
        // Update OrbitControls - camera stays at center, controls rotate around it
        if (controlsRef.current) {
          controlsRef.current.target.copy(newCenter)
          controlsRef.current.minDistance = 0.1
          controlsRef.current.maxDistance = finalMaxSize * 0.8
          controlsRef.current.enablePan = true
          controlsRef.current.screenSpacePanning = true
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
        
        // Update OrbitControls
        if (controlsRef.current) {
          controlsRef.current.target.copy(finalCenter)
          controlsRef.current.minDistance = maxSize * 0.3
          controlsRef.current.maxDistance = maxSize * 8
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
      target: controlsRef.current?.target.toArray()
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
          controlsRef.current.minDistance = 0.1 // Very close since we're inside
          controlsRef.current.maxDistance = finalMaxSize * 0.8 // Increased from 0.4 to 0.8 for more panning range
          controlsRef.current.enablePan = true // Enable panning for exploration
          controlsRef.current.screenSpacePanning = true // Better panning behavior
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
        
        // Update OrbitControls
        if (controlsRef.current) {
          controlsRef.current.target.copy(finalCenter)
          controlsRef.current.minDistance = maxSize * 0.3
          controlsRef.current.maxDistance = maxSize * 8
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
      target: controlsRef.current?.target.toArray()
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
          setIsLoading(false)
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
          const mtlPath = `${folderPath}/model.mtl`
          mtlLoader.setPath('/') // Set root path since we're using absolute paths
          
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
                  setIsLoading(false)
                },
                (progress) => {
                  // Progress callback
                },
                (error) => {
                  setError('Failed to load OBJ model')
                  setIsLoading(false)
                }
              )
            },
            (progress) => {
              // Progress callback
            },
            (error) => {
              console.warn('MTL loading failed, loading OBJ without materials:', error)
              // Continue without materials
              const objLoader = new OBJLoader()
              objLoader.load(
                scan.modelPath,
                (object) => {
                  loadOBJModelFromObject(object)
                  setIsLoading(false)
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
          )
        } else {
          // Local uploaded model - no MTL support for now
          console.log('Local uploaded OBJ model - loading without materials')
          const objLoader = new OBJLoader()
          objLoader.load(
            scan.modelPath,
            (object) => {
              loadOBJModelFromObject(object)
              setIsLoading(false)
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
            setIsLoading(false)
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
        
        // Update OrbitControls - camera stays at center, controls rotate around it
        controls.target.copy(newCenter)
        controls.minDistance = 0.1 // Very close since we're inside
        controls.maxDistance = finalMaxSize * 0.8 // Increased from 0.4 to 0.8 for more panning range
        controls.enablePan = true // Enable panning for exploration
        controls.screenSpacePanning = true // Better panning behavior
        
        console.log('Camera positioned INSIDE small GLB/GLTF model:', {
          originalMaxSize,
          finalMaxSize,
          position: camera.position.toArray(),
          target: newCenter.toArray(),
          fov: camera.fov
        })
      } else {
        // For larger models, use traditional outside positioning
        const optimalDistance = maxSize * 2.0 // Reduced from 4.0 to 2.0
        
        // Position camera to show entire model
        camera.position.set(
          finalCenter.x + optimalDistance,
          finalCenter.y + optimalDistance * 0.8,
          finalCenter.z + optimalDistance
        )
        camera.lookAt(finalCenter)
        
        // Update OrbitControls
        controls.target.copy(finalCenter)
        controls.minDistance = maxSize * 0.3
        controls.maxDistance = maxSize * 8
        
        console.log('Camera positioned for large GLB/GLTF model:', {
          originalMaxSize,
          maxSize,
          optimalDistance,
          position: camera.position.toArray(),
          target: finalCenter.toArray()
        })
      }
      
      console.log('Final GLB/GLTF camera position:', {
        position: camera.position.toArray(),
        target: controls.target.toArray()
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
        
        // Update OrbitControls - camera stays at center, controls rotate around it
        controls.target.copy(newCenter)
        controls.minDistance = 0.1 // Very close since we're inside
        controls.maxDistance = finalMaxSize * 0.8 // Increased from 0.4 to 0.8 for more panning range
        controls.enablePan = true // Enable panning for exploration
        controls.screenSpacePanning = true // Better panning behavior
        
        console.log('Camera positioned INSIDE small model:', {
          originalMaxSize,
          finalMaxSize,
          position: camera.position.toArray(),
          target: newCenter.toArray(),
          fov: camera.fov
        })
      } else {
        // For larger models, use traditional outside positioning
        const optimalDistance = maxSize * 2.0 // Reduced from 4.0 to 2.0
        
        // Position camera to show entire model
        camera.position.set(
          finalCenter.x + optimalDistance,
          finalCenter.y + optimalDistance * 0.8,
          finalCenter.z + optimalDistance
        )
        camera.lookAt(finalCenter)
        
        // Update OrbitControls
        controls.target.copy(finalCenter)
        controls.minDistance = maxSize * 0.3
        controls.maxDistance = maxSize * 8
        
        console.log('Camera positioned for large model:', {
          originalMaxSize,
          maxSize,
          optimalDistance,
          position: camera.position.toArray(),
          target: finalCenter.toArray()
        })
      }
      
      console.log('Final camera position:', {
        position: camera.position.toArray(),
        target: controls.target.toArray()
      })
      
      // Update camera projection
      camera.updateProjectionMatrix()
      
      // Update controls
      controls.update()
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
                         
                         // Update controls - stay inside model bounds
                         controls.target.copy(center)
                         controls.minDistance = 0.1
                         controls.maxDistance = maxSize * 0.8
                         controls.enablePan = true
                         controls.screenSpacePanning = true
                         
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
                         
                         // Update controls
                         controls.target.copy(center)
                         controls.minDistance = maxSize * 0.3
                         controls.maxDistance = maxSize * 8
                         
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
     </div>
   )
})
