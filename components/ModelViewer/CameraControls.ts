import * as THREE from 'three'
import { CameraControls } from './types'

export function createCameraControls(camera: THREE.PerspectiveCamera): CameraControls {
  const controls: CameraControls = {
    position: new THREE.Vector3(0, 1, 0),
    rotation: new THREE.Euler(0, -Math.PI / 2, 0, 'YXZ'),
    modelSize: 1.0,
    
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
      
      // Calculate pan speed based on model size with much better curve for small objects
      const basePanSpeed = 0.003 // Reduced base speed for smoother control
      const sizeMultiplier = Math.max(0.01, controls.modelSize) // Allow even smaller sizes
      
      // Use a much more gradual curve for small objects to prevent too fast panning
      let panSpeed: number
      if (sizeMultiplier < 0.5) {
        // For very small objects, use extremely slow panning with exponential scaling
        panSpeed = basePanSpeed * Math.pow(sizeMultiplier, 2) * 0.5
      } else if (sizeMultiplier < 1.0) {
        // For small objects, use slower panning with quadratic scaling
        panSpeed = basePanSpeed * (0.2 + 0.8 * Math.pow(sizeMultiplier, 1.5))
      } else {
        // For large objects, use linear scaling
        panSpeed = basePanSpeed * sizeMultiplier
      }
      
      // Ensure minimum and maximum pan speeds with tighter bounds for small objects
      panSpeed = Math.max(0.0005, Math.min(0.015, panSpeed))
      
      // Log pan speed for debugging (only occasionally to avoid spam)
      if (Math.random() < 0.01) { // 1% chance to log
        console.log('📐 Pan speed calculation:', { 
          modelSize: controls.modelSize, 
          sizeMultiplier, 
          panSpeed: panSpeed.toFixed(6),
          isSmallModel: sizeMultiplier < 1.0,
          speedCategory: sizeMultiplier < 0.5 ? 'very_small' : sizeMultiplier < 1.0 ? 'small' : 'large'
        })
      }
      
      // Apply panning
      const panX = right.clone().multiplyScalar(-deltaX * panSpeed)
      const panY = up.clone().multiplyScalar(-deltaY * panSpeed)
      
      controls.position.add(panX)
      controls.position.add(panY)
      
      controls.update()
    },
    
    // Rotate camera view (yaw and pitch)
    rotate: (deltaX: number, deltaY: number) => {
      // Calculate rotation speed based on model size for smoother control of small objects
      const baseRotationSpeed = 0.008 // Reduced base speed for smoother control
      const sizeMultiplier = Math.max(0.01, controls.modelSize)
      
      // Use a more gradual curve for small objects to prevent jerky rotation
      let rotationSpeed: number
      if (sizeMultiplier < 0.5) {
        // For very small objects, use extremely slow rotation with exponential scaling
        rotationSpeed = baseRotationSpeed * Math.pow(sizeMultiplier, 1.8) * 0.4
      } else if (sizeMultiplier < 1.0) {
        // For small objects, use slower rotation with quadratic scaling
        rotationSpeed = baseRotationSpeed * (0.25 + 0.75 * Math.pow(sizeMultiplier, 1.2))
      } else {
        // For large objects, use linear scaling
        rotationSpeed = baseRotationSpeed * sizeMultiplier
      }
      
      // Ensure minimum and maximum rotation speeds
      rotationSpeed = Math.max(0.002, Math.min(0.015, rotationSpeed))
      
      // Yaw rotation (left/right)
      controls.rotation.y -= deltaX * rotationSpeed
      
      // Pitch rotation (up/down) with limits to prevent flipping
      controls.rotation.x -= deltaY * rotationSpeed
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
  
  return controls
}
