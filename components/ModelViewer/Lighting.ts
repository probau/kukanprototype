import * as THREE from 'three'
import { LightingMode } from './types'

export function createLights(): THREE.Group {
  const lightsGroup = new THREE.Group()

  // Lighting - Enhanced for better visibility
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8)
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

  return lightsGroup
}

export function updateLighting(lights: THREE.Group, mode: LightingMode) {
  const lightArray = lights.children as THREE.Light[]
  
  switch (mode) {
    case 'bright':
      lightArray.forEach((light, index) => {
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
      lightArray.forEach((light, index) => {
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
      lightArray.forEach((light, index) => {
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
