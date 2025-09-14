'use client'

/**
 * Custom Questions Manager Component
 * Main interface for managing custom feedback questions
 * Agent: business-onboarding
 */

import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, GripVertical, Sparkles, TrendingUp, Calendar, Target } from 'lucide-react'
import { CustomQuestionsService } from '@/lib/services/custom-questions-service'
import { QuestionGenerator } from '@/lib/ai/question-generator'
import type { CustomQuestion, QuestionFormData } from '@/types/custom-questions'
import { QuestionCreationModal } from './QuestionCreationModal'
import { QuestionFrequencySettings } from './QuestionFrequencySettings'
import { QuestionTargeting } from './QuestionTargeting'
import { QuestionAnalytics } from './QuestionAnalytics'

interface CustomQuestionsManagerProps {
  businessId: string
  businessType: string
  businessGoals?: string[]
  stores?: Array<{ id: string; name: string }>
  onUpdate?: () => void
}

export function CustomQuestionsManager({
  businessId,
  businessType,
  businessGoals = [],
  stores = [],
  onUpdate,
}: CustomQuestionsManagerProps) {
  const [questions, setQuestions] = useState<CustomQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<CustomQuestion | null>(null)
  const [showAnalytics, setShowAnalytics] = useState<string | null>(null)
  const [generatingAI, setGeneratingAI] = useState(false)
  const [draggedItem, setDraggedItem] = useState<string | null>(null)

  useEffect(() => {
    loadQuestions()
  }, [businessId])

  const loadQuestions = async () => {
    try {
      setLoading(true)
      const loadedQuestions = await CustomQuestionsService.getQuestions(businessId)
      setQuestions(loadedQuestions)
    } catch (error) {
      console.error('Error loading questions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateQuestion = async (formData: QuestionFormData) => {
    const result = await CustomQuestionsService.addQuestion(businessId, formData)
    if (result.success) {
      await loadQuestions()
      setIsCreating(false)
      onUpdate?.()
    } else {
      alert(result.error || 'Failed to create question')
    }
  }

  const handleUpdateQuestion = async (questionId: string, updates: Partial<CustomQuestion>) => {
    const result = await CustomQuestionsService.updateQuestion(businessId, questionId, updates)
    if (result.success) {
      await loadQuestions()
      setEditingQuestion(null)
      onUpdate?.()
    } else {
      alert(result.error || 'Failed to update question')
    }
  }

  const handleDeleteQuestion = async (questionId: string) => {
    if (confirm('Are you sure you want to delete this question?')) {
      const result = await CustomQuestionsService.deleteQuestion(businessId, questionId)
      if (result.success) {
        await loadQuestions()
        onUpdate?.()
      } else {
        alert(result.error || 'Failed to delete question')
      }
    }
  }

  const handleGenerateFromGoals = async () => {
    if (businessGoals.length === 0) {
      alert('Please set business goals first in the onboarding section')
      return
    }

    setGeneratingAI(true)
    try {
      const result = await QuestionGenerator.generateFromGoals({
        businessGoals,
        businessType,
        existingQuestions: questions,
        contextData: null, // Could pass full context here
        language: 'auto',
        count: 3,
      })

      if (result.success && result.questions) {
        // Add generated questions as drafts
        for (const questionData of result.questions) {
          const formData: QuestionFormData = {
            text: questionData.text || '',
            textSv: questionData.textSv,
            frequencyType: questionData.frequency?.type || 'every_nth',
            frequencyValue: questionData.frequency?.value || 10,
            stores: questionData.targeting?.stores || 'all',
            seasonalEnabled: questionData.seasonal?.enabled || false,
            priority: questionData.priority || 5,
            followUpEnabled: questionData.metadata?.followUpEnabled || true,
            category: questionData.metadata?.category,
          }

          await CustomQuestionsService.addQuestion(businessId, formData)
        }

        await loadQuestions()
        onUpdate?.()
        alert(`Successfully generated ${result.questions.length} questions from your goals!`)
      } else {
        alert(result.error || 'Failed to generate questions')
      }
    } finally {
      setGeneratingAI(false)
    }
  }

  const handleDragStart = (questionId: string) => {
    setDraggedItem(questionId)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!draggedItem || draggedItem === targetId) return

    const draggedIndex = questions.findIndex(q => q.id === draggedItem)
    const targetIndex = questions.findIndex(q => q.id === targetId)

    if (draggedIndex === -1 || targetIndex === -1) return

    const newQuestions = [...questions]
    const [removed] = newQuestions.splice(draggedIndex, 1)
    newQuestions.splice(targetIndex, 0, removed)

    setQuestions(newQuestions)
    setDraggedItem(null)

    // Save new order
    const questionIds = newQuestions.map(q => q.id)
    await CustomQuestionsService.reorderQuestions(businessId, questionIds)
    onUpdate?.()
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'paused': return 'bg-yellow-100 text-yellow-800'
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'archived': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Custom Questions</h3>
          <p className="text-sm text-gray-600 mt-1">
            Create targeted questions to gather specific feedback
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleGenerateFromGoals}
            disabled={generatingAI || businessGoals.length === 0}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {generatingAI ? 'Generating...' : 'Generate from Goals'}
          </button>
          <button
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Question
          </button>
        </div>
      </div>

      {/* Questions Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">{questions.length}</div>
          <div className="text-sm text-gray-600">Total Questions</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-green-600">
            {questions.filter(q => q.status === 'active').length}
          </div>
          <div className="text-sm text-gray-600">Active Questions</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-blue-600">
            {questions.filter(q => q.source === 'ai_generated').length}
          </div>
          <div className="text-sm text-gray-600">AI Generated</div>
        </div>
      </div>

      {/* Questions List */}
      <div className="bg-white rounded-lg border border-gray-200">
        {questions.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <Target className="h-12 w-12" />
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No questions yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating your first custom question or generating from goals.
            </p>
            <div className="mt-6">
              <button
                onClick={() => setIsCreating(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create First Question
              </button>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {questions.map((question) => (
              <li
                key={question.id}
                draggable
                onDragStart={() => handleDragStart(question.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, question.id)}
                className={`p-4 hover:bg-gray-50 transition-colors ${
                  draggedItem === question.id ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 cursor-move">
                    <GripVertical className="h-5 w-5 text-gray-400" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {question.text}
                        </p>
                        {question.textSv && (
                          <p className="text-sm text-gray-500 italic mt-1">
                            {question.textSv}
                          </p>
                        )}

                        <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                          <span className="inline-flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            Every {question.frequency.value}
                            {question.frequency.type === 'every_nth' ? 'th customer' : '%'}
                          </span>
                          <span className="inline-flex items-center">
                            <Target className="h-3 w-3 mr-1" />
                            {question.targeting.stores === 'all'
                              ? 'All stores'
                              : `${question.targeting.stores.length} stores`}
                          </span>
                          {question.seasonal.enabled && (
                            <span className="inline-flex items-center text-orange-600">
                              <Calendar className="h-3 w-3 mr-1" />
                              Seasonal
                            </span>
                          )}
                        </div>

                        <div className="mt-2 flex items-center space-x-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusBadgeColor(
                              question.status
                            )}`}
                          >
                            {question.status}
                          </span>
                          {question.source === 'ai_generated' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                              <Sparkles className="h-3 w-3 mr-1" />
                              AI Generated
                            </span>
                          )}
                          {question.effectiveness.totalResponses > 0 && (
                            <span className="inline-flex items-center text-xs text-gray-500">
                              <TrendingUp className="h-3 w-3 mr-1" />
                              {(question.effectiveness.responseRate * 100).toFixed(0)}% response rate
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => setShowAnalytics(question.id)}
                          className="text-gray-400 hover:text-blue-600"
                        >
                          <TrendingUp className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setEditingQuestion(question)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(question.id)}
                          className="text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Modals */}
      {isCreating && (
        <QuestionCreationModal
          isOpen={isCreating}
          onClose={() => setIsCreating(false)}
          onSubmit={handleCreateQuestion}
          stores={stores}
          businessType={businessType}
        />
      )}

      {editingQuestion && (
        <QuestionCreationModal
          isOpen={!!editingQuestion}
          onClose={() => setEditingQuestion(null)}
          onSubmit={(formData) => {
            if (editingQuestion) {
              handleUpdateQuestion(editingQuestion.id, {
                text: formData.text,
                textSv: formData.textSv,
                frequency: {
                  type: formData.frequencyType,
                  value: formData.frequencyValue,
                },
                targeting: {
                  stores: formData.stores,
                },
                seasonal: {
                  enabled: formData.seasonalEnabled,
                  startDate: formData.seasonalStart?.toISOString(),
                  endDate: formData.seasonalEnd?.toISOString(),
                  recurring: formData.seasonalRecurring,
                },
                priority: formData.priority,
                metadata: {
                  ...editingQuestion.metadata,
                  category: formData.category,
                  followUpEnabled: formData.followUpEnabled,
                },
              })
            }
          }}
          stores={stores}
          businessType={businessType}
          initialData={editingQuestion}
        />
      )}

      {showAnalytics && (
        <QuestionAnalytics
          questionId={showAnalytics}
          businessId={businessId}
          onClose={() => setShowAnalytics(null)}
        />
      )}
    </div>
  )
}