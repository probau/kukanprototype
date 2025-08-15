import * as THREE from 'three'
import { CameraControls } from './types'

export interface AnimationCallbacks {
  onAnimationStart: () => void
  onAnimationComplete: () => void
}

export function playEntranceAnimation(
  controls: CameraControls,
  callbacks: AnimationCallbacks,
  isSmallModel: boolean = false
): () => void {
  if (!controls) return () => {}
  
  callbacks.onAnimationStart()
  
  // Store initial target position based on model size
  const targetPosition = isSmallModel 
    ? new THREE.Vector3(0, 0.01, 0)  // Small model - almost touching the ground
    : new THREE.Vector3(0, 2, 0)     // Large model - further view
  
  // Start from much higher position - top-down approach
  // Small models start from much closer, large models from further
  const startPosition = isSmallModel
    ? new THREE.Vector3(0, 0.5, 0)  // Small model - almost touching the ground start
    : new THREE.Vector3(0, 20, 0)   // Large model - further start
  const startRotation = new THREE.Euler(0, 0, 0, 'YXZ')
  
  // Set initial camera position
  controls.position.copy(startPosition)
  controls.rotation.copy(startRotation)
  controls.update()
  
  // Create animation timeline - longer duration for more dramatic effect
  const startTime = Date.now()
  const animationDuration = 3500 // 3.5 seconds for slower, more cinematic movement
  
  let animationFrameId: number | null = null
  
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
    if (controls) {
      controls.position.copy(currentPosition)
      controls.rotation.copy(currentRotation)
      controls.update()
    }
    
    if (progress < 1) {
      animationFrameId = requestAnimationFrame(animate)
    } else {
      // Animation complete - ensure final position is exact and looking at (0, 0, 0)
      if (controls) {
        controls.position.copy(targetPosition)
        // Calculate final rotation to look at (0, 0, 0)
        const lookAtTarget = new THREE.Vector3(0, 0, 0)
        const direction = new THREE.Vector3().subVectors(lookAtTarget, targetPosition).normalize()
        // Convert to Euler angles that work with manual rotation system
        const yaw = Math.atan2(direction.x, direction.z)
        const pitch = Math.asin(-direction.y)
        const finalRotation = new THREE.Euler(pitch, yaw, 0, 'YXZ')
        controls.rotation.copy(finalRotation)
        
        // Update controls and ensure smooth transition to manual control
        controls.update()
        
        // Ensure camera maintains focus on (0, 0, 0) after animation
        // by updating the camera matrix directly without conflicting with controls
        // Note: This will be handled by the main component
      }
      
      callbacks.onAnimationComplete()
    }
  }
  
  animate()
  
  // Return cleanup function
  return () => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
  }
}
