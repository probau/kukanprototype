'use client'

import { useState, useEffect, useRef } from 'react'
import ScanSelector from '@/components/ScanSelector'
import ModelViewer, { ModelViewerRef } from '@/components/ModelViewer'
import ChatInterface from '@/components/ChatInterface'
import { Scan } from '@/types/scan'

export default function Home() {
  const [scans, setScans] = useState<Scan[]>([])
  const [selectedScan, setSelectedScan] = useState<Scan | null>(null)
  const modelViewerRef = useRef<ModelViewerRef>(null)

  useEffect(() => {
    const fetchScans = async () => {
      try {
        const response = await fetch('/api/scans')
        const data = await response.json()
        setScans(data.scans)
        
        // Auto-select first scan if available
        if (data.scans.length > 0 && !selectedScan) {
          setSelectedScan(data.scans[0])
        }
      } catch (error) {
        console.error('Error fetching scans:', error)
      }
    }

    fetchScans()
  }, [selectedScan])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20 py-2">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-primary">Kukan</h1>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">AI Room Analysis Prototype</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <ScanSelector
                scans={scans}
                selectedScan={selectedScan}
                onScanSelect={setSelectedScan}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {selectedScan ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
            {/* 3D Model Viewer */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">3D Room View</h2>
                <p className="text-sm text-gray-600">Navigate and explore the room from any angle</p>
              </div>
              <div className="h-full">
                <ModelViewer ref={modelViewerRef} scan={selectedScan} />
              </div>
            </div>

            {/* Chat Interface */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">AI Room Analysis</h2>
                <p className="text-sm text-gray-600">Ask questions about what you see in the 3D view</p>
              </div>
              <div className="h-full">
                <ChatInterface 
                  scan={selectedScan} 
                  modelViewerRef={modelViewerRef}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Room Selected</h3>
            <p className="text-gray-500">Select a room scan from the dropdown above to get started.</p>
          </div>
        )}
      </main>
    </div>
  )
}
