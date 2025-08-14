'use client'

import { useState, useEffect } from 'react'
import ScanSelector from '@/components/ScanSelector'
import ModelViewer from '@/components/ModelViewer'
import ChatInterface from '@/components/ChatInterface'
import { Scan } from '@/types/scan'

export default function Home() {
  const [selectedScan, setSelectedScan] = useState<Scan | null>(null)
  const [scans, setScans] = useState<Scan[]>([])

  useEffect(() => {
    // Load available scans
    const loadScans = async () => {
      try {
        const response = await fetch('/api/scans')
        const data = await response.json()
        setScans(data.scans)
        if (data.scans.length > 0) {
          setSelectedScan(data.scans[0])
        }
      } catch (error) {
        console.error('Failed to load scans:', error)
      }
    }

    loadScans()
  }, [])

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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: 3D Model Viewer */}
          <div className="card p-4">
            <h2 className="text-lg font-semibold mb-4">3D Room Model</h2>
            <div className="h-96 bg-gray-100 rounded-lg overflow-hidden">
              {selectedScan ? (
                <ModelViewer scan={selectedScan} />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  Select a scan to view the 3D model
                </div>
              )}
            </div>
          </div>

          {/* Right: Chat Interface */}
          <div className="card p-4">
            <h2 className="text-lg font-semibold mb-4">AI Room Analysis</h2>
            {selectedScan ? (
              <ChatInterface scan={selectedScan} />
            ) : (
              <div className="text-gray-500 text-center py-8">
                Select a scan to start asking questions
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
