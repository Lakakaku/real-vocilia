'use client'

/**
 * Question Analytics Component
 * Display performance metrics and effectiveness tracking
 * Agent: business-onboarding
 */

import { useState, useEffect } from 'react'
import { X, TrendingUp, TrendingDown, Minus, Users, MessageSquare, ThumbsUp, ThumbsDown } from 'lucide-react'
import type { CustomQuestion, QuestionAnalytics as Analytics } from '@/types/custom-questions'
import { CustomQuestionsService } from '@/lib/services/custom-questions-service'
import { QuestionGenerator } from '@/lib/ai/question-generator'

interface QuestionAnalyticsProps {
  questionId: string
  businessId: string
  onClose: () => void
}

export function QuestionAnalytics({
  questionId,
  businessId,
  onClose,
}: QuestionAnalyticsProps) {
  const [question, setQuestion] = useState<CustomQuestion | null>(null)
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [improving, setImproving] = useState(false)
  const [suggestion, setSuggestion] = useState<string>('')

  useEffect(() => {
    loadAnalytics()
  }, [questionId, businessId])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      const questions = await CustomQuestionsService.getQuestions(businessId)
      const q = questions.find(q => q.id === questionId)

      if (q) {
        setQuestion(q)

        // Mock analytics data (in production, this would come from an API)
        const mockAnalytics: Analytics = {
          questionId,
          period: {
            start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            end: new Date().toISOString(),
          },
          metrics: {
            timesAsked: q.effectiveness.totalResponses || 0,
            timesAnswered: Math.floor((q.effectiveness.totalResponses || 0) * (q.effectiveness.responseRate || 0)),
            avgResponseLength: 85,
            avgResponseTime: 45,
            qualityImpact: q.effectiveness.avgQualityBoost || 0,
            insightsGenerated: Math.floor((q.effectiveness.totalResponses || 0) * 0.3),
          },
          trends: {
            responseRateTrend: q.effectiveness.responseRate > 0.7 ? 'stable' : 'declining',
            qualityTrend: q.effectiveness.avgQualityBoost > 5 ? 'improving' : 'stable',
          },
          recommendations: {
            action: q.effectiveness.responseRate < 0.5 ? 'modify' : 'keep',
            reason: q.effectiveness.responseRate < 0.5
              ? 'Low response rate indicates the question may not resonate with customers'
              : 'Good performance metrics, question is effective',
          },
        }

        setAnalytics(mockAnalytics)
      }
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleImproveQuestion = async () => {
    if (!question || !analytics) return

    setImproving(true)
    try {
      const result = await QuestionGenerator.improveQuestion(question, analytics)

      if (result.success && result.suggestion) {
        setSuggestion(result.suggestion)

        if (result.improvedText) {
          // Could offer to update the question directly
          const shouldUpdate = confirm(
            `Would you like to update the question to: "${result.improvedText}"?`
          )

          if (shouldUpdate) {
            await CustomQuestionsService.updateQuestion(businessId, questionId, {
              text: result.improvedText,
            })
            await loadAnalytics()
          }
        }
      }
    } finally {
      setImproving(false)
    }
  }

  const getTrendIcon = (trend: 'improving' | 'stable' | 'declining') => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'declining': return <TrendingDown className="h-4 w-4 text-red-500" />
      default: return <Minus className="h-4 w-4 text-gray-500" />
    }
  }

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'keep': return 'bg-green-100 text-green-800'
      case 'modify': return 'bg-yellow-100 text-yellow-800'
      case 'remove': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (!question || !analytics) {
    return null
  }

  const responseRate = analytics.metrics.timesAsked > 0
    ? (analytics.metrics.timesAnswered / analytics.metrics.timesAsked * 100).toFixed(1)
    : '0'

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Question Analytics</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
          {/* Question Overview */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-gray-900 mb-2">{question.text}</p>
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <span>Created {new Date(question.createdAt).toLocaleDateString()}</span>
              <span>•</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                getActionBadgeColor(analytics.recommendations.action)
              }`}>
                Recommendation: {analytics.recommendations.action}
              </span>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <Users className="h-5 w-5 text-gray-400" />
                {getTrendIcon(analytics.trends.responseRateTrend)}
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold text-gray-900">{responseRate}%</div>
                <div className="text-xs text-gray-600">Response Rate</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <MessageSquare className="h-5 w-5 text-gray-400" />
              <div className="mt-2">
                <div className="text-2xl font-bold text-gray-900">
                  {analytics.metrics.timesAnswered}
                </div>
                <div className="text-xs text-gray-600">Responses</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <TrendingUp className="h-5 w-5 text-gray-400" />
                {getTrendIcon(analytics.trends.qualityTrend)}
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold text-gray-900">
                  {analytics.metrics.qualityImpact > 0 ? '+' : ''}
                  {analytics.metrics.qualityImpact}%
                </div>
                <div className="text-xs text-gray-600">Quality Impact</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="h-5 w-5 text-gray-400">💡</div>
              <div className="mt-2">
                <div className="text-2xl font-bold text-gray-900">
                  {analytics.metrics.insightsGenerated}
                </div>
                <div className="text-xs text-gray-600">Insights</div>
              </div>
            </div>
          </div>

          {/* Sentiment Analysis */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Response Sentiment</h4>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center space-x-6">
                <div className="flex items-center">
                  <ThumbsUp className="h-4 w-4 text-green-500 mr-2" />
                  <span className="text-sm text-gray-700">
                    Positive: {question.effectiveness.sentiment.positive}
                  </span>
                </div>
                <div className="flex items-center">
                  <Minus className="h-4 w-4 text-gray-500 mr-2" />
                  <span className="text-sm text-gray-700">
                    Neutral: {question.effectiveness.sentiment.neutral}
                  </span>
                </div>
                <div className="flex items-center">
                  <ThumbsDown className="h-4 w-4 text-red-500 mr-2" />
                  <span className="text-sm text-gray-700">
                    Negative: {question.effectiveness.sentiment.negative}
                  </span>
                </div>
              </div>

              {/* Sentiment Bar */}
              <div className="mt-3 h-4 bg-gray-200 rounded-full overflow-hidden flex">
                {question.effectiveness.sentiment.positive > 0 && (
                  <div
                    className="bg-green-500"
                    style={{
                      width: `${(question.effectiveness.sentiment.positive /
                        (question.effectiveness.sentiment.positive +
                          question.effectiveness.sentiment.neutral +
                          question.effectiveness.sentiment.negative)) *
                        100}%`,
                    }}
                  />
                )}
                {question.effectiveness.sentiment.neutral > 0 && (
                  <div
                    className="bg-gray-400"
                    style={{
                      width: `${(question.effectiveness.sentiment.neutral /
                        (question.effectiveness.sentiment.positive +
                          question.effectiveness.sentiment.neutral +
                          question.effectiveness.sentiment.negative)) *
                        100}%`,
                    }}
                  />
                )}
                {question.effectiveness.sentiment.negative > 0 && (
                  <div
                    className="bg-red-500"
                    style={{
                      width: `${(question.effectiveness.sentiment.negative /
                        (question.effectiveness.sentiment.positive +
                          question.effectiveness.sentiment.neutral +
                          question.effectiveness.sentiment.negative)) *
                        100}%`,
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Performance Details */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Performance Details</h4>
            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
              <div className="px-4 py-3 flex justify-between">
                <span className="text-sm text-gray-600">Average Response Length</span>
                <span className="text-sm font-medium text-gray-900">
                  {analytics.metrics.avgResponseLength} characters
                </span>
              </div>
              <div className="px-4 py-3 flex justify-between">
                <span className="text-sm text-gray-600">Average Response Time</span>
                <span className="text-sm font-medium text-gray-900">
                  {analytics.metrics.avgResponseTime} seconds
                </span>
              </div>
              <div className="px-4 py-3 flex justify-between">
                <span className="text-sm text-gray-600">Last Asked</span>
                <span className="text-sm font-medium text-gray-900">
                  {question.effectiveness.lastAskedAt
                    ? new Date(question.effectiveness.lastAskedAt).toLocaleDateString()
                    : 'Never'}
                </span>
              </div>
              <div className="px-4 py-3 flex justify-between">
                <span className="text-sm text-gray-600">Total Times Asked</span>
                <span className="text-sm font-medium text-gray-900">
                  {analytics.metrics.timesAsked}
                </span>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-yellow-900 mb-2">Recommendations</h4>
            <p className="text-sm text-yellow-800">{analytics.recommendations.reason}</p>

            <button
              onClick={handleImproveQuestion}
              disabled={improving}
              className="mt-3 px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 disabled:opacity-50"
            >
              {improving ? 'Generating Suggestions...' : 'Get AI Improvement Suggestions'}
            </button>

            {suggestion && (
              <div className="mt-3 p-3 bg-white rounded border border-yellow-200">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{suggestion}</p>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}