'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

export default function ContextPage() {
  const [loading, setLoading] = useState(true)
  const [context, setContext] = useState<any>(null)
  const [message, setMessage] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [completenessScore, setCompletenessScore] = useState(0)
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/business/login')
        return
      }

      // Load existing context
      const { data: contextData } = await supabase
        .from('business_contexts')
        .select('*')
        .eq('business_id', user.id)
        .single()

      if (contextData) {
        setContext(contextData)
        setCompletenessScore(contextData.completeness_score || 0)
      }

      setLoading(false)
    } catch (error) {
      console.error('Error loading context:', error)
      setLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!message.trim() || isProcessing) return

    setIsProcessing(true)
    const userMessage = message
    setMessage('')

    try {
      // Call AI assistant API
      const response = await fetch('/api/context/ai-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          conversation_id: context?.ai_conversation_id || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get AI response')
      }

      // Update AI response
      setAiResponse(data.response)

      // Store conversation ID for session continuity
      if (data.conversation_id && context) {
        context.ai_conversation_id = data.conversation_id
      }

      // Update completeness score if context was updated
      if (data.context_updates?.suggested?.length > 0) {
        // Refetch context to get updated completeness score
        await checkAuth()
      }

    } catch (error) {
      console.error('Error sending message to AI:', error)
      setAiResponse(
        'I apologize, but I encountered an error. Please try again or continue building your context manually.'
      )
    } finally {
      setIsProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">AI Context Management</h1>
        <p className="text-gray-600 mt-2">
          Build comprehensive context to improve fraud detection and feedback quality
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Context Score Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4">Context Completeness</h2>

            <div className="relative pt-1">
              <div className="flex mb-2 items-center justify-between">
                <div>
                  <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                    Progress
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold inline-block text-blue-600">
                    {completenessScore}%
                  </span>
                </div>
              </div>
              <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200">
                <div
                  style={{ width: `${completenessScore}%` }}
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-600 transition-all duration-500"
                ></div>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Target: 85% for optimal fraud detection
            </p>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Business Info</span>
                <span className="text-green-600">✓</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Products/Services</span>
                <span className="text-yellow-600">...</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Customer Patterns</span>
                <span className="text-gray-400">○</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Transaction Patterns</span>
                <span className="text-gray-400">○</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Staff Information</span>
                <span className="text-gray-400">○</span>
              </div>
            </div>
          </div>

          {/* Context Categories */}
          <div className="bg-white rounded-lg shadow-md p-6 mt-6">
            <h3 className="text-lg font-semibold mb-4">Context Categories</h3>
            <div className="space-y-2">
              <button className="w-full text-left px-4 py-2 rounded hover:bg-gray-100">
                🏢 Business Details
              </button>
              <button className="w-full text-left px-4 py-2 rounded hover:bg-gray-100">
                🛍️ Products & Services
              </button>
              <button className="w-full text-left px-4 py-2 rounded hover:bg-gray-100">
                👥 Customer Demographics
              </button>
              <button className="w-full text-left px-4 py-2 rounded hover:bg-gray-100">
                💳 Transaction Patterns
              </button>
              <button className="w-full text-left px-4 py-2 rounded hover:bg-gray-100">
                📋 Operations
              </button>
              <button className="w-full text-left px-4 py-2 rounded hover:bg-gray-100">
                🎯 Business Goals
              </button>
            </div>
          </div>
        </div>

        {/* AI Chat Interface */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md h-full flex flex-col">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">AI Context Assistant</h2>
              <p className="text-sm text-gray-600 mt-1">
                Powered by GPT-4o-mini - Let&apos;s build your business context together
              </p>
            </div>

            <div className="flex-1 p-6 overflow-y-auto min-h-[400px]">
              <div className="space-y-4">
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg p-4 max-w-md">
                    <p className="text-sm">
                      👋 Hello! I&apos;m your AI context assistant. I&apos;ll help you build a comprehensive
                      business context that will improve fraud detection and help you understand
                      your customer feedback better.
                    </p>
                    <p className="text-sm mt-2">
                      Let&apos;s start with your business basics. What type of business do you run?
                    </p>
                  </div>
                </div>

                {aiResponse && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-lg p-4 max-w-md">
                      <p className="text-sm">{aiResponse}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isProcessing}
                />
                <button
                  onClick={sendMessage}
                  disabled={isProcessing || !message.trim()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? 'Processing...' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 bg-white rounded-lg hover:shadow-md transition">
            <span className="text-2xl">📊</span>
            <p className="mt-2 font-medium">Import from POS</p>
            <p className="text-sm text-gray-600">Connect your existing systems</p>
          </button>
          <button className="p-4 bg-white rounded-lg hover:shadow-md transition">
            <span className="text-2xl">📝</span>
            <p className="mt-2 font-medium">Manual Entry</p>
            <p className="text-sm text-gray-600">Fill in details manually</p>
          </button>
          <button className="p-4 bg-white rounded-lg hover:shadow-md transition">
            <span className="text-2xl">🤖</span>
            <p className="mt-2 font-medium">AI Discovery</p>
            <p className="text-sm text-gray-600">Let AI learn from feedback</p>
          </button>
        </div>
      </div>
    </div>
  )
}