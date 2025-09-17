'use client'

/**
 * FraudInsights - AI-powered fraud detection insights and recommendations
 *
 * Features:
 * - AI-powered fraud pattern detection using OpenAI GPT-4o-mini
 * - Real-time fraud risk assessment with confidence scores
 * - Pattern recognition across transaction batches
 * - Actionable recommendations for verifiers
 * - Visual risk indicators and trend analysis
 * - Historical fraud pattern learning
 * - Integration with verification workflow
 * - Detailed explanation of fraud indicators
 */

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  AlertTriangle,
  Shield,
  Brain,
  TrendingUp,
  TrendingDown,
  Eye,
  ChevronDown,
  RefreshCw,
  Loader2,
  Target,
  Zap,
  BarChart3,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Info,
  Lightbulb,
  Flag,
  MessageSquare
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface FraudPattern {
  id: string
  pattern_type: 'velocity' | 'amount' | 'account' | 'timing' | 'behavioral' | 'network'
  description: string
  confidence_score: number
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  affected_transactions: number
  first_detected: string
  last_detected: string
  severity: number
  indicators: string[]
  recommended_action: 'monitor' | 'investigate' | 'block' | 'approve_with_caution'
}

interface FraudRecommendation {
  id: string
  recommendation_type: 'verification_focus' | 'pattern_alert' | 'process_improvement' | 'risk_mitigation'
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  confidence: number
  implementation_effort: 'low' | 'medium' | 'high'
  potential_impact: 'low' | 'medium' | 'high'
  actionable_steps: string[]
  affected_areas: string[]
}

interface BatchRiskAssessment {
  batch_id: string
  overall_risk_score: number
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  confidence: number
  risk_factors: {
    velocity_risk: number
    amount_risk: number
    pattern_risk: number
    timing_risk: number
  }
  flagged_transactions: number
  total_transactions: number
  ai_assessment: {
    summary: string
    key_concerns: string[]
    verification_priorities: string[]
    estimated_processing_time: number
  }
}

interface FraudInsightsProps {
  sessionId?: string
  batchId?: string
  className?: string
  showDetailed?: boolean
  autoRefresh?: boolean
  refreshInterval?: number
  onPatternDetected?: (pattern: FraudPattern) => void
  onRecommendationClick?: (recommendation: FraudRecommendation) => void
}

interface InsightsState {
  isLoading: boolean
  error: string | null
  lastUpdated: string | null
  patterns: FraudPattern[]
  recommendations: FraudRecommendation[]
  riskAssessment: BatchRiskAssessment | null
  aiProcessing: boolean
}

export function FraudInsights({
  sessionId,
  batchId,
  className,
  showDetailed = true,
  autoRefresh = true,
  refreshInterval = 60000, // 1 minute
  onPatternDetected,
  onRecommendationClick
}: FraudInsightsProps) {
  const [insightsState, setInsightsState] = useState<InsightsState>({
    isLoading: false,
    error: null,
    lastUpdated: null,
    patterns: [],
    recommendations: [],
    riskAssessment: null,
    aiProcessing: false
  })

  const [expandedPatterns, setExpandedPatterns] = useState<Set<string>>(new Set())
  const [selectedPattern, setSelectedPattern] = useState<FraudPattern | null>(null)

  // Load fraud insights data
  const loadInsights = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setInsightsState(prev => ({ ...prev, isLoading: true, error: null }))
      }

      let url = '/api/verification/fraud-insights'
      const params = new URLSearchParams()

      if (sessionId) params.append('session_id', sessionId)
      if (batchId) params.append('batch_id', batchId)

      if (params.toString()) {
        url += `?${params.toString()}`
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to load fraud insights: ${response.statusText}`)
      }

      const data = await response.json()

      setInsightsState({
        isLoading: false,
        error: null,
        lastUpdated: new Date().toISOString(),
        patterns: data.patterns || [],
        recommendations: data.recommendations || [],
        riskAssessment: data.risk_assessment || null,
        aiProcessing: data.ai_processing || false
      })

      // Notify about new patterns
      if (onPatternDetected && data.patterns?.length > 0) {
        data.patterns.forEach((pattern: FraudPattern) => {
          const isNewPattern = new Date(pattern.first_detected).getTime() > Date.now() - refreshInterval
          if (isNewPattern) {
            onPatternDetected(pattern)
          }
        })
      }

    } catch (error) {
      console.error('Failed to load fraud insights:', error)

      setInsightsState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load fraud insights'
      }))
    }
  }, [sessionId, batchId, refreshInterval, onPatternDetected])

  // Trigger AI analysis
  const triggerAIAnalysis = async () => {
    try {
      setInsightsState(prev => ({ ...prev, aiProcessing: true, error: null }))

      let url = '/api/verification/fraud-insights/analyze'
      const params = new URLSearchParams()

      if (sessionId) params.append('session_id', sessionId)
      if (batchId) params.append('batch_id', batchId)

      if (params.toString()) {
        url += `?${params.toString()}`
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        throw new Error(`AI analysis failed: ${response.statusText}`)
      }

      // Reload insights after analysis
      setTimeout(() => {
        loadInsights(false)
      }, 2000)

    } catch (error) {
      console.error('AI analysis failed:', error)
      setInsightsState(prev => ({
        ...prev,
        aiProcessing: false,
        error: error instanceof Error ? error.message : 'AI analysis failed'
      }))
    }
  }

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return

    loadInsights()

    const interval = setInterval(() => {
      loadInsights(false)
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, loadInsights])

  // Get risk level display
  const getRiskDisplay = (riskLevel: 'low' | 'medium' | 'high' | 'critical') => {
    switch (riskLevel) {
      case 'critical':
        return {
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: AlertTriangle,
          bgColor: 'bg-red-50',
          textColor: 'text-red-700'
        }
      case 'high':
        return {
          color: 'bg-orange-100 text-orange-800 border-orange-200',
          icon: Flag,
          bgColor: 'bg-orange-50',
          textColor: 'text-orange-700'
        }
      case 'medium':
        return {
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: Eye,
          bgColor: 'bg-yellow-50',
          textColor: 'text-yellow-700'
        }
      case 'low':
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: Shield,
          bgColor: 'bg-green-50',
          textColor: 'text-green-700'
        }
      default:
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: Info,
          bgColor: 'bg-gray-50',
          textColor: 'text-gray-700'
        }
    }
  }

  // Get pattern type icon
  const getPatternIcon = (patternType: FraudPattern['pattern_type']) => {
    switch (patternType) {
      case 'velocity': return TrendingUp
      case 'amount': return BarChart3
      case 'account': return Users
      case 'timing': return Clock
      case 'behavioral': return Brain
      case 'network': return Target
      default: return Flag
    }
  }

  // Render risk assessment overview
  const renderRiskAssessment = () => {
    if (!insightsState.riskAssessment) return null

    const riskDisplay = getRiskDisplay(insightsState.riskAssessment.risk_level)
    const RiskIcon = riskDisplay.icon

    return (
      <Card className={cn('mb-6', riskDisplay.bgColor, className)}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <RiskIcon className="h-5 w-5" />
              <span>AI Risk Assessment</span>
            </CardTitle>
            <Badge className={riskDisplay.color} variant="outline">
              {insightsState.riskAssessment.risk_level.toUpperCase()} RISK
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Overall Risk Score */}
          <div className="text-center">
            <div className="text-3xl font-bold mb-2 text-gray-900">
              {insightsState.riskAssessment.overall_risk_score}/100
            </div>
            <div className="text-sm text-gray-600 mb-4">
              Risk Score (Confidence: {insightsState.riskAssessment.confidence}%)
            </div>

            {/* Risk Factors */}
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <div className="font-semibold">
                  {insightsState.riskAssessment.risk_factors.velocity_risk}%
                </div>
                <div className="text-xs text-gray-600">Velocity Risk</div>
              </div>
              <div className="text-center">
                <div className="font-semibold">
                  {insightsState.riskAssessment.risk_factors.amount_risk}%
                </div>
                <div className="text-xs text-gray-600">Amount Risk</div>
              </div>
              <div className="text-center">
                <div className="font-semibold">
                  {insightsState.riskAssessment.risk_factors.pattern_risk}%
                </div>
                <div className="text-xs text-gray-600">Pattern Risk</div>
              </div>
              <div className="text-center">
                <div className="font-semibold">
                  {insightsState.riskAssessment.risk_factors.timing_risk}%
                </div>
                <div className="text-xs text-gray-600">Timing Risk</div>
              </div>
            </div>
          </div>

          {/* AI Assessment Summary */}
          {insightsState.riskAssessment.ai_assessment && (
            <div className="border-t pt-4">
              <h4 className="font-medium mb-2 flex items-center">
                <Brain className="h-4 w-4 mr-2" />
                AI Assessment
              </h4>
              <p className="text-sm text-gray-700 mb-3">
                {insightsState.riskAssessment.ai_assessment.summary}
              </p>

              {insightsState.riskAssessment.ai_assessment.key_concerns.length > 0 && (
                <div className="mb-3">
                  <div className="text-sm font-medium text-gray-700 mb-1">Key Concerns:</div>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {insightsState.riskAssessment.ai_assessment.key_concerns.map((concern, idx) => (
                      <li key={idx} className="flex items-start">
                        <AlertTriangle className="h-3 w-3 mt-1 mr-2 text-orange-500 flex-shrink-0" />
                        {concern}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="text-xs text-gray-600">
                Est. Processing Time: {insightsState.riskAssessment.ai_assessment.estimated_processing_time} minutes
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // Render fraud patterns
  const renderPatterns = () => {
    if (insightsState.patterns.length === 0) return null

    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Flag className="h-5 w-5" />
            <span>Detected Patterns ({insightsState.patterns.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {insightsState.patterns.map((pattern) => {
            const riskDisplay = getRiskDisplay(pattern.risk_level)
            const PatternIcon = getPatternIcon(pattern.pattern_type)
            const isExpanded = expandedPatterns.has(pattern.id)

            return (
              <div key={pattern.id} className={cn('border rounded-lg p-3', riskDisplay.bgColor)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <PatternIcon className="h-4 w-4 text-gray-600" />
                    <div>
                      <div className="font-medium text-sm">{pattern.description}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        {pattern.affected_transactions} transactions • Confidence: {pattern.confidence_score}%
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Badge className={riskDisplay.color} variant="outline" size="sm">
                      {pattern.risk_level.toUpperCase()}
                    </Badge>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedPattern(pattern)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                    </Dialog>

                    <Collapsible
                      open={isExpanded}
                      onOpenChange={(open) => {
                        const newExpanded = new Set(expandedPatterns)
                        if (open) {
                          newExpanded.add(pattern.id)
                        } else {
                          newExpanded.delete(pattern.id)
                        }
                        setExpandedPatterns(newExpanded)
                      }}
                    >
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <ChevronDown className={cn(
                            "h-4 w-4 transition-transform",
                            isExpanded && "rotate-180"
                          )} />
                        </Button>
                      </CollapsibleTrigger>
                    </Collapsible>
                  </div>
                </div>

                <Collapsible open={isExpanded}>
                  <CollapsibleContent className="mt-3 pt-3 border-t">
                    <div className="space-y-3 text-sm">
                      {/* Indicators */}
                      {pattern.indicators.length > 0 && (
                        <div>
                          <div className="font-medium text-gray-700 mb-1">Fraud Indicators:</div>
                          <ul className="space-y-1">
                            {pattern.indicators.map((indicator, idx) => (
                              <li key={idx} className="flex items-start">
                                <Target className="h-3 w-3 mt-1 mr-2 text-red-500 flex-shrink-0" />
                                {indicator}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Recommended Action */}
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-gray-600">Recommended Action:</span>
                          <Badge variant="outline" className="ml-2">
                            {pattern.recommended_action.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-500">
                          Detected: {new Date(pattern.first_detected).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )
          })}
        </CardContent>
      </Card>
    )
  }

  // Render recommendations
  const renderRecommendations = () => {
    if (insightsState.recommendations.length === 0) return null

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Lightbulb className="h-5 w-5" />
            <span>AI Recommendations ({insightsState.recommendations.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {insightsState.recommendations.map((rec) => {
            const priorityColors = {
              critical: 'bg-red-100 text-red-800',
              high: 'bg-orange-100 text-orange-800',
              medium: 'bg-yellow-100 text-yellow-800',
              low: 'bg-green-100 text-green-800'
            }

            return (
              <div
                key={rec.id}
                className="border rounded-lg p-3 cursor-pointer hover:bg-gray-50"
                onClick={() => onRecommendationClick?.(rec)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-sm mb-1">{rec.title}</div>
                    <div className="text-sm text-gray-600 mb-2">{rec.description}</div>

                    <div className="flex items-center space-x-2 text-xs">
                      <Badge className={priorityColors[rec.priority]} variant="outline">
                        {rec.priority.toUpperCase()}
                      </Badge>
                      <span className="text-gray-500">
                        Impact: {rec.potential_impact} • Effort: {rec.implementation_effort}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500">
                    {rec.confidence}% confidence
                  </div>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold flex items-center space-x-2">
            <Brain className="h-5 w-5" />
            <span>Fraud Insights</span>
            {insightsState.aiProcessing && (
              <Badge variant="secondary" className="ml-2">
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                AI Processing
              </Badge>
            )}
          </h3>
          {insightsState.lastUpdated && (
            <p className="text-sm text-gray-600">
              Last updated: {new Date(insightsState.lastUpdated).toLocaleTimeString()}
            </p>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={triggerAIAnalysis}
            disabled={insightsState.aiProcessing}
          >
            {insightsState.aiProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Zap className="h-4 w-4 mr-2" />
            )}
            AI Analysis
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => loadInsights()}
            disabled={insightsState.isLoading}
          >
            {insightsState.isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {insightsState.error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{insightsState.error}</span>
            <Button variant="outline" size="sm" onClick={() => loadInsights()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {insightsState.isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-2">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
            <p className="text-sm text-gray-600">Analyzing fraud patterns...</p>
          </div>
        </div>
      )}

      {/* Content */}
      {!insightsState.isLoading && (
        <>
          {renderRiskAssessment()}
          {showDetailed && renderPatterns()}
          {showDetailed && renderRecommendations()}

          {/* No Data State */}
          {!insightsState.riskAssessment &&
           insightsState.patterns.length === 0 &&
           insightsState.recommendations.length === 0 &&
           !insightsState.error && (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Fraud Insights Available</h3>
              <p className="text-gray-600 mb-4">
                Run AI analysis to detect fraud patterns and get recommendations.
              </p>
              <Button onClick={triggerAIAnalysis} disabled={insightsState.aiProcessing}>
                <Brain className="h-4 w-4 mr-2" />
                Start AI Analysis
              </Button>
            </div>
          )}
        </>
      )}

      {/* Pattern Detail Dialog */}
      {selectedPattern && (
        <Dialog open={!!selectedPattern} onOpenChange={() => setSelectedPattern(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Fraud Pattern Details</DialogTitle>
              <DialogDescription>
                Pattern detected in {selectedPattern.affected_transactions} transactions
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <div className="font-medium text-sm mb-2">Pattern Description</div>
                <p className="text-sm text-gray-700">{selectedPattern.description}</p>
              </div>

              <div>
                <div className="font-medium text-sm mb-2">Risk Assessment</div>
                <div className="flex items-center space-x-2">
                  <Badge className={getRiskDisplay(selectedPattern.risk_level).color}>
                    {selectedPattern.risk_level.toUpperCase()}
                  </Badge>
                  <span className="text-sm">Confidence: {selectedPattern.confidence_score}%</span>
                </div>
              </div>

              {selectedPattern.indicators.length > 0 && (
                <div>
                  <div className="font-medium text-sm mb-2">Fraud Indicators</div>
                  <ul className="space-y-1">
                    {selectedPattern.indicators.map((indicator, idx) => (
                      <li key={idx} className="text-sm text-gray-600 flex items-start">
                        <Target className="h-3 w-3 mt-1 mr-2 text-red-500 flex-shrink-0" />
                        {indicator}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <div className="font-medium text-sm mb-2">Recommended Action</div>
                <Badge variant="outline">
                  {selectedPattern.recommended_action.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}