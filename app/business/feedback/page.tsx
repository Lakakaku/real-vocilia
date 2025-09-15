'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

export default function FeedbackPage() {
  const [loading, setLoading] = useState(true)
  const [feedbacks, setFeedbacks] = useState<any[]>([])
  const [selectedWeek, setSelectedWeek] = useState('current')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterQuality, setFilterQuality] = useState('all')
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    checkAuthAndLoadFeedback()
  }, [selectedWeek])

  const checkAuthAndLoadFeedback = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/business/login')
        return
      }

      // Load feedback for the business
      // TODO: Implement actual feedback loading from database
      setFeedbacks([
        {
          id: 1,
          customer_phone: '46701234567',
          store_name: 'Main Store',
          timestamp: new Date().toISOString(),
          quality_score: 8.5,
          reward_percentage: 10,
          amount: 299,
          reward_amount: 29.9,
          sentiment: 'positive',
          summary: 'Great service and product quality. Staff was very helpful.',
          categories: ['Service', 'Product Quality'],
        },
        {
          id: 2,
          customer_phone: '46709876543',
          store_name: 'Main Store',
          timestamp: new Date().toISOString(),
          quality_score: 6.2,
          reward_percentage: 5,
          amount: 150,
          reward_amount: 7.5,
          sentiment: 'neutral',
          summary: 'Average experience. Product was okay but checkout was slow.',
          categories: ['Checkout', 'Product'],
        },
      ])

      setLoading(false)
    } catch (error) {
      console.error('Error loading feedback:', error)
      setLoading(false)
    }
  }

  const filteredFeedbacks = feedbacks.filter(fb => {
    const matchesSearch = fb.summary.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesQuality = filterQuality === 'all' ||
      (filterQuality === 'high' && fb.quality_score >= 7) ||
      (filterQuality === 'medium' && fb.quality_score >= 5 && fb.quality_score < 7) ||
      (filterQuality === 'low' && fb.quality_score < 5)

    return matchesSearch && matchesQuality
  })

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
        <h1 className="text-3xl font-bold text-gray-900">Weekly Feedback Analytics</h1>
        <p className="text-gray-600 mt-2">
          Review customer feedback and gain insights to improve your business
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Total Feedback</p>
          <p className="text-2xl font-bold text-gray-900">{feedbacks.length}</p>
          <p className="text-xs text-green-600 mt-2">+12% from last week</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Average Quality</p>
          <p className="text-2xl font-bold text-gray-900">7.4</p>
          <p className="text-xs text-yellow-600 mt-2">Target: 8.0</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Total Rewards</p>
          <p className="text-2xl font-bold text-gray-900">374 SEK</p>
          <p className="text-xs text-gray-600 mt-2">This week</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Participation Rate</p>
          <p className="text-2xl font-bold text-gray-900">14%</p>
          <p className="text-xs text-green-600 mt-2">Above average</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Week Selection
            </label>
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="current">Current Week</option>
              <option value="last">Last Week</option>
              <option value="month">Last Month</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quality Filter
            </label>
            <select
              value={filterQuality}
              onChange={(e) => setFilterQuality(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Quality</option>
              <option value="high">High (7+)</option>
              <option value="medium">Medium (5-7)</option>
              <option value="low">Low (&lt;5)</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Feedback
            </label>
            <input
              type="text"
              placeholder="Search by content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Feedback List */}
      <div className="space-y-4">
        {filteredFeedbacks.map((feedback) => (
          <div key={feedback.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-500">
                    {new Date(feedback.timestamp).toLocaleString('sv-SE')}
                  </span>
                  <span className="text-sm text-gray-500">
                    {feedback.store_name}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    feedback.sentiment === 'positive' ? 'bg-green-100 text-green-800' :
                    feedback.sentiment === 'negative' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {feedback.sentiment}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{feedback.quality_score}/10</p>
                <p className="text-sm text-gray-600">Quality Score</p>
              </div>
            </div>

            <p className="text-gray-800 mb-4">{feedback.summary}</p>

            <div className="flex flex-wrap gap-2 mb-4">
              {feedback.categories.map((cat: string, idx: number) => (
                <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                  {cat}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
              <div>
                <p className="text-sm text-gray-600">Transaction</p>
                <p className="font-medium">{feedback.amount} SEK</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Reward</p>
                <p className="font-medium">{feedback.reward_percentage}% ({feedback.reward_amount} SEK)</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Customer</p>
                <p className="font-medium">***{feedback.customer_phone.slice(-4)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredFeedbacks.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No feedback found matching your criteria</p>
        </div>
      )}
    </div>
  )
}