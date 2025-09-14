'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { ContextCategories } from './components/ContextCategories'
import { ContextCompleteness } from './components/ContextCompleteness'
import { ContextChat } from './components/ContextChat'
import { updateContextCategory } from '@/app/actions/context-actions'
import type { ContextCategory } from './components/ContextCategories'

export default function ContextPage() {
  const [loading, setLoading] = useState(true)
  const [context, setContext] = useState<any>(null)
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

  const handleCategoryUpdate = async (categoryId: string, categoryData: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const result = await updateContextCategory(user.id, categoryId, categoryData)

      if (result.success) {
        // Refetch context to get updated data and completeness score
        await checkAuth()
      } else {
        console.error('Failed to update context category:', result.error)
        // Could add error notification here
      }
    } catch (error) {
      console.error('Error updating context category:', error)
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
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">AI Context Management</h1>
        <p className="text-gray-600 mt-2">
          Build comprehensive context to improve fraud detection and feedback quality
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar - Context Overview */}
        <div className="lg:col-span-1 space-y-6">
          <ContextCompleteness
            overallScore={completenessScore}
            categories={[]} // Categories are managed internally by ContextCategories component
            onCategoryClick={(categoryId) => {
              // Scroll to categories section or trigger category modal
              const element = document.getElementById(`category-${categoryId}`)
              element?.scrollIntoView({ behavior: 'smooth' })
            }}
          />
        </div>

        {/* Center - Context Categories */}
        <div className="lg:col-span-2">
          <ContextCategories
            contextData={context}
            businessId={context?.business_id}
            onCategoryUpdate={handleCategoryUpdate}
          />

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

        {/* Right Sidebar - AI Chat */}
        <div className="lg:col-span-1">
          <ContextChat
            businessId={context?.business_id || ''}
            onContextUpdate={(updates) => {
              // Refetch context when AI suggests updates
              checkAuth()
            }}
            completenessScore={completenessScore}
            className="sticky top-8 max-h-[calc(100vh-4rem)]"
          />
        </div>
      </div>
    </div>
  )
}