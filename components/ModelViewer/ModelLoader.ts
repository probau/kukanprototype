import * as THREE from 'three'
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js'
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { Scan } from './types'

export interface ModelLoadCallbacks {
  onModelLoaded: (object: THREE.Object3D, size: THREE.Vector3, center: THREE.Vector3, isSmallModel: boolean) => void
  onError: (error: string) => void
  onLoadingComplete: () => void
}

export function loadGLTFModel(
  gltf: any,
  scene: THREE.Scene,
  callbacks: ModelLoadCallbacks
) {
  const model = gltf.scene
  
  console.log('🔍 GLTF model details - Children count:', model.children.length)
  
  // Calculate model bounds
  const box = new THREE.Box3().setFromObject(model)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  
  console.log('📏 GLTF model bounds - Size:', size, 'Center:', center)
  
  // Center the model
  model.position.sub(center)
  
  // Add to scene
  console.log('➕ Adding GLTF model to scene')
  scene.add(model)
  
  // Determine if this is a small or large model
  const maxSize = Math.max(size.x, size.y, size.z)
  
  if (maxSize < 3.0) {
    // Small model - keep camera at user-specified position
    console.log('📷 Small model detected, keeping camera at default position')
    callbacks.onModelLoaded(model, size, center, true)
  } else {
    // Large model - adjust camera for better view
    console.log('📷 Large model detected, camera will be adjusted by controls')
    const cameraDistance = maxSize * 2
    const cameraPosition = center.clone().add(new THREE.Vector3(cameraDistance, cameraDistance, cameraDistance))
    
    callbacks.onModelLoaded(model, size, center, false)
  }
  
  callbacks.onLoadingComplete()
}

export function loadOBJModel(
  scan: Scan,
  scene: THREE.Scene,
  callbacks: ModelLoadCallbacks
) {
  if (scan.hasMtl) {
    // Load MTL file first
    const mtlLoader = new MTLLoader()
    const folderPath = scan.modelPath.substring(0, scan.modelPath.lastIndexOf('/'))
    
    // For server models, construct the correct MTL path
    if (scan.modelPath.startsWith('/scans/')) {
      // For now, just try 'model.mtl' first since that's what living-room has
      const mtlPath = `${folderPath}/model.mtl`
      
      console.log('Loading MTL file from:', mtlPath, 'for OBJ file:', scan.modelPath)
      
      mtlLoader.load(
        mtlPath,
        (materials) => {
          materials.preload()
          
          // Load OBJ with materials
          const objLoader = new OBJLoader()
          objLoader.setMaterials(materials)
          
          objLoader.load(
            scan.modelPath,
            (object) => {
              loadOBJModelFromObject(object, scene, callbacks)
            },
            (progress) => {
              console.log('OBJ loading progress:', (progress.loaded / progress.total * 100) + '%')
            },
            (error) => {
              console.error('OBJ loading failed:', error)
              const errorMessage = error instanceof Error ? error.message : 'Unknown error'
              callbacks.onError(`Failed to load OBJ model: ${errorMessage}`)
            }
          )
        },
        (progress) => {
          console.log('MTL loading progress:', (progress.loaded / progress.total * 100) + '%')
        },
        (error) => {
          console.warn('MTL loading failed, loading OBJ without materials:', error)
          console.log('Attempting to load OBJ without materials as fallback')
          const objLoader = new OBJLoader()
          objLoader.load(
            scan.modelPath,
            (object) => {
              console.log('OBJ loaded successfully without materials')
              loadOBJModelFromObject(object, scene, callbacks)
            },
            (progress) => {
              console.log('OBJ loading progress:', (progress.loaded / progress.total * 100) + '%')
            },
            (error) => {
              console.error('OBJ loading failed even without materials:', error)
              const errorMessage = error instanceof Error ? error.message : 'Unknown error'
              callbacks.onError(`Failed to load OBJ model: ${errorMessage}`)
            }
          )
        }
      )
    } else {
      // For local files, try to find MTL file
      const objFileName = scan.modelPath.split('/').pop()?.split('.')[0]
      const mtlPath = `${folderPath}/${objFileName}.mtl`
      
      mtlLoader.load(
        mtlPath,
        (materials) => {
          materials.preload()
          
          const objLoader = new OBJLoader()
          objLoader.setMaterials(materials)
          
          objLoader.load(
            scan.modelPath,
            (object) => {
              loadOBJModelFromObject(object, scene, callbacks)
            },
            (progress) => {
              console.log('OBJ loading progress:', (progress.loaded / progress.total * 100) + '%')
            },
            (error) => {
              console.error('OBJ loading failed:', error)
              const errorMessage = error instanceof Error ? error.message : 'Unknown error'
              callbacks.onError(`Failed to load OBJ model: ${errorMessage}`)
            }
          )
        },
        (progress) => {
          console.log('MTL loading progress:', (progress.loaded / progress.total * 100) + '%')
        },
        (error) => {
          console.warn('MTL loading failed, loading OBJ without materials:', error)
          const objLoader = new OBJLoader()
          objLoader.load(
            scan.modelPath,
            (object) => {
              loadOBJModelFromObject(object, scene, callbacks)
            },
            (progress) => {
              console.log('OBJ loading progress:', (progress.loaded / progress.total * 100) + '%')
            },
            (error) => {
              console.error('OBJ loading failed:', error)
              const errorMessage = error instanceof Error ? error.message : 'Unknown error'
              callbacks.onError(`Failed to load OBJ model: ${errorMessage}`)
            }
          )
        }
      )
    }
  } else {
    // No MTL file, load OBJ without materials
    const objLoader = new OBJLoader()
    objLoader.load(
      scan.modelPath,
      (object) => {
        loadOBJModelFromObject(object, scene, callbacks)
      },
      (progress) => {
        console.log('OBJ loading progress:', (progress.loaded / progress.total * 100) + '%')
      },
      (error) => {
        console.error('OBJ loading failed:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        callbacks.onError(`Failed to load OBJ model: ${errorMessage}`)
      }
    )
  }
}

function loadOBJModelFromObject(
  object: THREE.Object3D,
  scene: THREE.Scene,
  callbacks: ModelLoadCallbacks
) {
  console.log('🔍 OBJ model details - Children count:', object.children.length)
  
  // Calculate model bounds
  const box = new THREE.Box3().setFromObject(object)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  
  console.log('📏 OBJ model bounds - Size:', size, 'Center:', center)
  
  // Center the model
  object.position.sub(center)
  
  // Add to scene
  console.log('➕ Adding OBJ model to scene')
  scene.add(object)
  
  // Determine if this is a small or large model
  const maxSize = Math.max(size.x, size.y, size.z)
  
  if (maxSize < 3.0) {
    // Small model - keep camera at user-specified position
    console.log('📷 Small model detected, keeping camera at default position')
    callbacks.onModelLoaded(object, size, center, true)
  } else {
    // Large model - adjust camera for better view
    console.log('📷 Large model detected, camera will be adjusted by controls')
    const cameraDistance = maxSize * 2
    const cameraPosition = center.clone().add(new THREE.Vector3(cameraDistance, cameraDistance, cameraDistance))
    
    callbacks.onModelLoaded(object, size, center, false)
  }
  
  callbacks.onLoadingComplete()
}
