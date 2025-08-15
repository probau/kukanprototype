'use client'

import { Scan } from '@/types/scan'
import { ChevronDown } from 'lucide-react'

interface ScanSelectorProps {
  scans: Scan[]
  selectedScan: Scan | null
  onScanSelect: (scan: Scan) => void
}

export default function ScanSelector({ scans, selectedScan, onScanSelect }: ScanSelectorProps) {
  return (
    <div className="relative min-w-0">
      <label htmlFor="scan-select" className="block text-sm font-medium text-gray-700 mb-1">
        Select Room Scan
      </label>
      <div className="relative">
        <select
          id="scan-select"
          value={selectedScan?.id || ''}
          onChange={(e) => {
            const scan = scans.find(s => s.id === e.target.value)
            if (scan) onScanSelect(scan)
          }}
          className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent w-48"
        >
          {scans.map((scan) => (
            <option key={scan.id} value={scan.id}>
              {scan.name}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
      </div>
      
    </div>
  )
}
