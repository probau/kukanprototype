'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Camera } from 'lucide-react'
import { Scan, ChatMessage } from '@/types/scan'
import { ModelViewerRef } from './ModelViewer'

interface ChatInterfaceProps {
  scan: Scan
  modelViewerRef: React.RefObject<ModelViewerRef>
}

// Simple markdown parser for basic formatting
const parseMarkdown = (text: string): string => {
  return text
    // Bold text: **text** -> <strong>text</strong>
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic text: *text* -> <em>text</em> (but not bold)
    .replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
    // Code: `text` -> <code>text</code>
    .replace(/`(.*?)`/g, '<code>$1</code>')
    // Line breaks: \n -> <br>
    .replace(/\n/g, '<br>')
    // Lists: - item -> • item
    .replace(/^- (.+)$/gm, '• $1')
}

export default function ChatInterface({ scan, modelViewerRef }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isTakingScreenshot, setIsTakingScreenshot] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const takeScreenshot = async (): Promise<string | null> => {
    if (!modelViewerRef.current) {
      console.error('Model viewer ref not available')
      return null
    }

    setIsTakingScreenshot(true)
    
    try {
      // Small delay to ensure the UI updates
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const screenshot = modelViewerRef.current.takeScreenshot()
      return screenshot
    } catch (error) {
      console.error('Error taking screenshot:', error)
      return null
    } finally {
      setIsTakingScreenshot(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      // Take a screenshot of the current 3D view
      const screenshot = await takeScreenshot()
      
      if (!screenshot) {
        throw new Error('Failed to capture 3D view screenshot')
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          scanId: scan.id,
          screenshot: screenshot // Send the screenshot instead of roomImagePath
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const data = await response.json()
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Chat error:', error)
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error while analyzing the room. Please try again.',
        timestamp: new Date()
      }

      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const renderMessageContent = (content: string, role: 'user' | 'assistant') => {
    if (role === 'user') {
      return <p className="text-sm">{content}</p>
    }
    
    // Parse markdown for assistant messages
    const parsedContent = parseMarkdown(content)
    return (
      <div 
        className="text-sm markdown-content"
        dangerouslySetInnerHTML={{ __html: parsedContent }}
      />
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-2">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <Bot className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">Ask me anything about this room!</p>
            <p className="text-xs mt-1">I can analyze what you see from your current view</p>
            <div className="mt-3 flex items-center justify-center text-xs text-gray-400">
              <Camera className="h-3 w-3 mr-1" />
              <span>I'll capture your current 3D view</span>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.role === 'user'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <div className="flex items-start space-x-2">
                {message.role === 'user' ? (
                  <User className="h-4 w-4 mt-1 flex-shrink-0" />
                ) : (
                  <Bot className="h-4 w-4 mt-1 flex-shrink-0" />
                )}
                <div className="flex-1">
                  {renderMessageContent(message.content, message.role)}
                  <p className="text-xs opacity-70 mt-1">
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg">
              <div className="flex items-center space-x-2">
                <Bot className="h-4 w-4" />
                <div className="flex items-center space-x-2">
                  {isTakingScreenshot && (
                    <div className="flex items-center text-xs text-gray-600">
                      <Camera className="h-3 w-3 mr-1 animate-pulse" />
                      <span>Capturing view...</span>
                    </div>
                  )}
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex space-x-2 p-2 border-t border-gray-200">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ask about what you see in the 3D view..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={!inputValue.trim() || isLoading}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
        >
          {isTakingScreenshot ? (
            <>
              <Camera className="h-4 w-4 animate-pulse" />
              <span>Capturing...</span>
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              <span>Ask</span>
            </>
          )}
        </button>
      </form>

      {/* Example Questions */}
      {messages.length === 0 && (
        <div className="p-3 bg-gray-50 border-t border-gray-200">
          <p className="text-xs text-gray-600 mb-2">Try asking:</p>
          <div className="space-y-1">
            {[
              "What furniture do you see in this view?",
              "How far is the table from the wall?",
              "What's the size of the rug in this perspective?",
              "Can you see any windows or doors?"
            ].map((question, index) => (
              <button
                key={index}
                onClick={() => setInputValue(question)}
                className="block text-xs text-primary hover:text-blue-700 text-left w-full"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
