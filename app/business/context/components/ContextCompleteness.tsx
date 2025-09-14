'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { ContextCategory } from './ContextCategories'

interface CategoryProgress {
  id: string
  name: string
  icon: string
  completion: number
  priority: 'high' | 'medium' | 'low'
  status: 'complete' | 'in_progress' | 'not_started'
}

interface ContextCompletenessProps {
  overallScore: number
  categories: ContextCategory[]
  target?: number
  onCategoryClick?: (categoryId: string) => void
  className?: string
}

export function ContextCompleteness({
  overallScore,
  categories,
  target = 85,
  onCategoryClick,
  className
}: ContextCompletenessProps) {
  const categoryProgress: CategoryProgress[] = categories.map(cat => ({
    id: cat.id,
    name: cat.title,
    icon: cat.icon,
    completion: cat.completion,
    priority: cat.priority,
    status: cat.completion >= 80 ? 'complete' : cat.completion > 0 ? 'in_progress' : 'not_started'
  }))

  const getScoreColor = (score: number) => {
    if (score >= target) return 'text-green-600'
    if (score >= target * 0.7) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBackground = (score: number) => {
    if (score >= target) return 'bg-green-50 border-green-200'
    if (score >= target * 0.7) return 'bg-yellow-50 border-yellow-200'
    return 'bg-red-50 border-red-200'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete': return '✅'
      case 'in_progress': return '⏳'
      case 'not_started': return '⭕'
      default: return '⭕'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete': return 'text-green-600'
      case 'in_progress': return 'text-yellow-600'
      case 'not_started': return 'text-gray-400'
      default: return 'text-gray-400'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600'
      case 'medium': return 'text-yellow-600'
      case 'low': return 'text-green-600'
      default: return 'text-gray-600'
    }
  }

  const highPriorityIncomplete = categoryProgress.filter(
    cat => cat.priority === 'high' && cat.status !== 'complete'
  )

  const nextSteps = categoryProgress
    .filter(cat => cat.status !== 'complete')
    .sort((a, b) => {
      // Sort by priority first (high, medium, low), then by completion descending
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      }
      return b.completion - a.completion
    })
    .slice(0, 3)

  return (
    <div className={className}>
      <Card className={`transition-all duration-300 ${getScoreBackground(overallScore)}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Context Completeness</CardTitle>
            <Badge
              variant={overallScore >= target ? 'default' : 'secondary'}
              className="text-sm"
            >
              {Math.round(overallScore)}% Complete
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Main Progress Bar */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className={`text-sm font-bold ${getScoreColor(overallScore)}`}>
                {Math.round(overallScore)}% / {target}%
              </span>
            </div>
            <Progress
              value={overallScore}
              className="w-full h-3"
            />
            <p className="text-xs text-gray-600 mt-1">
              Target: {target}% for optimal fraud detection
            </p>
          </div>

          {/* Status Messages */}
          {overallScore >= target && (
            <Alert className="border-green-200 bg-green-50">
              <AlertDescription className="text-green-800">
                🎉 Excellent! Your context is comprehensive enough for optimal fraud detection.
              </AlertDescription>
            </Alert>
          )}

          {overallScore < target && highPriorityIncomplete.length > 0 && (
            <Alert variant="destructive">
              <AlertDescription>
                ⚠️ Focus on high-priority categories for better fraud detection.
              </AlertDescription>
            </Alert>
          )}

          {/* Category Progress List */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Category Progress</h4>
            {categoryProgress.map((category) => (
              <div
                key={category.id}
                className={`flex items-center justify-between p-2 rounded-lg hover:bg-white/50 transition-colors ${
                  onCategoryClick ? 'cursor-pointer' : ''
                }`}
                onClick={() => onCategoryClick?.(category.id)}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{category.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">{category.name}</span>
                      <Badge
                        variant={category.priority === 'high' ? 'destructive' : 'outline'}
                        className="text-xs"
                      >
                        {category.priority}
                      </Badge>
                    </div>
                    <Progress value={category.completion} className="w-24 h-1 mt-1" />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">
                    {Math.round(category.completion)}%
                  </span>
                  <span className={getStatusColor(category.status)}>
                    {getStatusIcon(category.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Next Steps */}
          {nextSteps.length > 0 && (
            <div>
              <h4 className="font-medium text-sm mb-2">Recommended Next Steps</h4>
              <div className="space-y-1">
                {nextSteps.map((step, index) => (
                  <div
                    key={step.id}
                    className="flex items-center space-x-2 text-sm p-2 bg-white/50 rounded"
                  >
                    <Badge variant="outline" className="text-xs w-6 h-6 rounded-full p-0 flex items-center justify-center">
                      {index + 1}
                    </Badge>
                    <span className="text-lg">{step.icon}</span>
                    <span className="flex-1">{step.name}</span>
                    <span className={getPriorityColor(step.priority)}>
                      {step.priority}
                    </span>
                    {onCategoryClick && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onCategoryClick(step.id)
                        }}
                        className="h-6 px-2 text-xs"
                      >
                        Edit
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-white/50 rounded">
              <div className="text-lg font-bold text-green-600">
                {categoryProgress.filter(c => c.status === 'complete').length}
              </div>
              <div className="text-xs text-gray-600">Complete</div>
            </div>
            <div className="p-2 bg-white/50 rounded">
              <div className="text-lg font-bold text-yellow-600">
                {categoryProgress.filter(c => c.status === 'in_progress').length}
              </div>
              <div className="text-xs text-gray-600">In Progress</div>
            </div>
            <div className="p-2 bg-white/50 rounded">
              <div className="text-lg font-bold text-gray-400">
                {categoryProgress.filter(c => c.status === 'not_started').length}
              </div>
              <div className="text-xs text-gray-600">Not Started</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}