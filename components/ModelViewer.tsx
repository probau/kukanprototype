'use client'

import React from 'react'
import ModularModelViewer, { ModelViewerRef, ModelViewerProps } from './ModelViewer/ModelViewer'

// Simple wrapper component that maintains the same interface
const ModelViewer = React.forwardRef<ModelViewerRef, ModelViewerProps>((props, ref) => {
  return <ModularModelViewer {...props} ref={ref} />
})

ModelViewer.displayName = 'ModelViewer'

export default ModelViewer
export type { ModelViewerRef, ModelViewerProps }
