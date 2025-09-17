/**
 * AI Fraud Detection Service with OpenAI Integration
 *
 * Integrates with OpenAI GPT-4o-mini for intelligent fraud detection,
 * risk assessment, and pattern analysis in payment verification workflows.
 */

import OpenAI from 'openai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import {
  type TransactionContext,
  type RiskFactors,
  type PatternDetection,
  type AIMetadata,
  FraudRiskScoring,
  FraudPatternDetection,
  type RiskLevel,
  type AIRecommendation,
} from '@/lib/verification/models/fraud-assessment'
import { AuditLogger } from '@/lib/verification/models/audit-log'

// OpenAI configuration
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// AI assessment request/response types
export interface AIAssessmentRequest {
  transaction_id: string
  business_id: string
  context: TransactionContext
  options?: {
    include_pattern_detection?: boolean
    confidence_threshold?: number
    model_version?: string
    enable_detailed_reasoning?: boolean
  }
}

export interface AIAssessmentResponse {
  assessment_id: string
  transaction_id: string
  risk_score: number
  risk_level: RiskLevel
  confidence: number
  recommendation: AIRecommendation
  reasoning: string[]
  risk_factors: RiskFactors
  pattern_analysis?: PatternDetection[]
  ai_metadata: AIMetadata
  assessment_timestamp: string
}

export interface BatchAssessmentRequest {
  business_id: string
  transactions: Array<{
    transaction_id: string
    context: TransactionContext
  }>
  options?: {
    enable_cross_transaction_analysis?: boolean
    parallel_processing?: boolean
    batch_size?: number
  }
}

export interface BatchAssessmentResponse {
  batch_id: string
  business_id: string
  total_transactions: number
  completed_assessments: number
  failed_assessments: number
  assessments: AIAssessmentResponse[]
  batch_patterns?: PatternDetection[]
  processing_time_ms: number
  ai_usage_summary: {
    total_tokens: number
    total_api_calls: number
    average_response_time_ms: number
  }
}

// AI prompt templates
const FRAUD_ASSESSMENT_PROMPT = `You are an expert fraud detection analyst for a Swedish payment verification system. Analyze the following transaction data and provide a comprehensive fraud risk assessment.

Transaction Details:
- ID: {transaction_id}
- Amount: {amount_sek} SEK
- Date/Time: {transaction_date}
- Store: {store_code}
- Quality Score: {quality_score}/100
- Reward: {reward_percentage}% ({reward_amount_sek} SEK)
- Customer: {phone_last4}

Customer History:
{customer_history}

Business Context:
{business_context}

Temporal Context:
{temporal_context}

Base Risk Analysis:
{base_risk_analysis}

Instructions:
1. Assess the overall fraud risk on a scale of 0-100
2. Categorize risk level as: low, medium, high, or critical
3. Provide a recommendation: approve, review, reject, or investigate
4. Give your confidence level (0.0-1.0)
5. List specific reasoning factors
6. Identify any suspicious patterns

Respond ONLY with valid JSON in this exact format:
{
  "risk_score": number,
  "risk_level": "low|medium|high|critical",
  "confidence": number,
  "recommendation": "approve|review|reject|investigate",
  "reasoning": ["reason1", "reason2", ...],
  "suspicious_indicators": ["indicator1", "indicator2", ...],
  "confidence_factors": ["factor1", "factor2", ...]
}`

const PATTERN_ANALYSIS_PROMPT = `You are analyzing multiple transactions for fraud patterns. Look for suspicious behaviors across these transactions:

{transactions_data}

Analysis Focus:
1. Rapid successive transactions
2. Identical or near-identical amounts
3. Perfect or suspiciously high quality scores
4. Unusual time patterns
5. Amount limit testing (amounts just under thresholds)
6. Same customer making multiple rapid transactions

Respond ONLY with valid JSON:
{
  "patterns_detected": [
    {
      "pattern_type": "string",
      "confidence": number,
      "instances": number,
      "affected_transactions": ["id1", "id2"],
      "risk_impact": "low|medium|high|critical",
      "description": "string"
    }
  ],
  "overall_risk_assessment": {
    "batch_risk_level": "low|medium|high|critical",
    "recommendation": "approve_all|review_flagged|investigate_all",
    "priority": "low|medium|high|critical"
  }
}`

export class AIFraudDetectionService {
  private supabase = createClient()
  private readonly modelVersion = 'gpt-4o-mini'
  private readonly maxRetries = 3
  private readonly timeoutMs = 30000

  /**
   * Performs comprehensive AI-powered fraud assessment
   */
  async assessTransaction(request: AIAssessmentRequest): Promise<AIAssessmentResponse> {
    const startTime = Date.now()
    const assessmentId = crypto.randomUUID()

    try {
      // Generate base risk analysis using local algorithms
      const baseRiskAnalysis = FraudRiskScoring.calculateBaseRiskScore(request.context)

      // Prepare context for AI analysis
      const aiContext = this.prepareAIContext(request.context, baseRiskAnalysis)

      // Call OpenAI for enhanced assessment
      const aiResponse = await this.callOpenAIAssessment(aiContext, request.options)

      // Combine AI assessment with base analysis
      const combinedAssessment = this.combineAssessments(
        baseRiskAnalysis,
        aiResponse,
        request.context
      )

      // Pattern detection if requested
      let patternAnalysis: PatternDetection[] = []
      if (request.options?.include_pattern_detection) {
        patternAnalysis = await this.detectPatterns([request.context])
      }

      const processingTime = Date.now() - startTime

      const assessment: AIAssessmentResponse = {
        assessment_id: assessmentId,
        transaction_id: request.transaction_id,
        risk_score: combinedAssessment.risk_score,
        risk_level: combinedAssessment.risk_level,
        confidence: combinedAssessment.confidence,
        recommendation: combinedAssessment.recommendation,
        reasoning: combinedAssessment.reasoning,
        risk_factors: combinedAssessment.risk_factors,
        pattern_analysis: patternAnalysis.length > 0 ? patternAnalysis : undefined,
        ai_metadata: {
          model_version: this.modelVersion,
          tokens_used: aiResponse.tokens_used,
          response_time_ms: processingTime,
          prompt_version: '1.0',
          assessment_timestamp: new Date().toISOString(),
          api_request_id: aiResponse.api_request_id,
          confidence_factors: aiResponse.confidence_factors,
        },
        assessment_timestamp: new Date().toISOString(),
      }

      // Store assessment in database
      await this.storeAssessment(assessment, request.business_id)

      // Create audit log
      await this.createAuditLog(assessment, request.business_id)

      return assessment

    } catch (error) {
      // Fallback to rule-based assessment if AI fails
      const fallbackAssessment = this.createFallbackAssessment(
        request,
        assessmentId,
        error instanceof Error ? error.message : 'AI service unavailable'
      )

      await this.createAuditLog(fallbackAssessment, request.business_id, {
        ai_service_error: error instanceof Error ? error.message : 'Unknown error'
      })

      return fallbackAssessment
    }
  }

  /**
   * Processes multiple transactions in batch with cross-transaction analysis
   */
  async assessBatch(request: BatchAssessmentRequest): Promise<BatchAssessmentResponse> {
    const startTime = Date.now()
    const batchId = crypto.randomUUID()
    const assessments: AIAssessmentResponse[] = []
    const failedAssessments: string[] = []
    let totalTokens = 0
    let totalApiCalls = 0
    let totalResponseTime = 0

    try {
      // Process transactions in parallel or sequential based on options
      const batchSize = request.options?.batch_size || 10
      const parallelProcessing = request.options?.parallel_processing ?? true

      for (let i = 0; i < request.transactions.length; i += batchSize) {
        const batch = request.transactions.slice(i, i + batchSize)

        const batchPromises = batch.map(async (transaction) => {
          try {
            const assessment = await this.assessTransaction({
              transaction_id: transaction.transaction_id,
              business_id: request.business_id,
              context: transaction.context,
              options: {
                include_pattern_detection: false, // Will do batch pattern analysis
                confidence_threshold: 0.7,
              },
            })

            totalTokens += assessment.ai_metadata.tokens_used
            totalApiCalls += 1
            totalResponseTime += assessment.ai_metadata.response_time_ms

            return assessment
          } catch (error) {
            failedAssessments.push(transaction.transaction_id)
            return null
          }
        })

        const batchResults = parallelProcessing
          ? await Promise.all(batchPromises)
          : await this.processSequentially(batchPromises)

        assessments.push(...batchResults.filter(Boolean) as AIAssessmentResponse[])
      }

      // Perform cross-transaction pattern analysis
      let batchPatterns: PatternDetection[] = []
      if (request.options?.enable_cross_transaction_analysis) {
        batchPatterns = await this.detectCrossTransactionPatterns(
          request.transactions.map(t => t.context)
        )
      }

      const processingTime = Date.now() - startTime

      const response: BatchAssessmentResponse = {
        batch_id: batchId,
        business_id: request.business_id,
        total_transactions: request.transactions.length,
        completed_assessments: assessments.length,
        failed_assessments: failedAssessments.length,
        assessments,
        batch_patterns: batchPatterns.length > 0 ? batchPatterns : undefined,
        processing_time_ms: processingTime,
        ai_usage_summary: {
          total_tokens: totalTokens,
          total_api_calls: totalApiCalls,
          average_response_time_ms: totalApiCalls > 0 ? totalResponseTime / totalApiCalls : 0,
        },
      }

      // Store batch results
      await this.storeBatchResults(response)

      return response

    } catch (error) {
      throw new Error(`Batch assessment failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Validates AI service health and model availability
   */
  async validateService(): Promise<{
    available: boolean
    model_accessible: boolean
    response_time_ms: number
    error?: string
  }> {
    const startTime = Date.now()

    try {
      const testResponse = await openai.chat.completions.create({
        model: this.modelVersion,
        messages: [
          {
            role: 'user',
            content: 'Respond with a single word: "available"',
          },
        ],
        max_tokens: 10,
        temperature: 0,
      })

      const responseTime = Date.now() - startTime
      const content = testResponse.choices[0]?.message?.content?.toLowerCase()

      return {
        available: true,
        model_accessible: content === 'available',
        response_time_ms: responseTime,
      }

    } catch (error) {
      return {
        available: false,
        model_accessible: false,
        response_time_ms: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  // Private helper methods

  private prepareAIContext(context: TransactionContext, baseAnalysis: any): string {
    const customerHistory = context.customer_history
      ? `- Total transactions: ${context.customer_history.total_transactions}
- Average amount: ${context.customer_history.average_amount} SEK
- Last transaction: ${context.customer_history.last_transaction_days_ago ? `${context.customer_history.last_transaction_days_ago} days ago` : 'First transaction'}
- Fraud history: ${context.customer_history.fraud_history ? 'Yes' : 'No'}`
      : 'No customer history available'

    const businessContext = context.business_context
      ? `- Average transaction: ${context.business_context.average_transaction_amount} SEK
- Peak hours: ${context.business_context.peak_hours.join(', ')}
- Typical rewards: ${context.business_context.typical_reward_range[0]}-${context.business_context.typical_reward_range[1]}%
- Recent fraud incidents: ${context.business_context.recent_fraud_incidents}`
      : 'No business context available'

    const temporalContext = context.temporal_context
      ? `- Hour: ${context.temporal_context.hour_of_day}
- Day of week: ${context.temporal_context.day_of_week}
- Holiday: ${context.temporal_context.is_holiday ? 'Yes' : 'No'}
- Peak hours: ${context.temporal_context.is_peak_hours ? 'Yes' : 'No'}`
      : 'No temporal context available'

    const baseRiskAnalysis = `Base risk score: ${baseAnalysis.base_score}/100
Risk factors: ${Object.entries(baseAnalysis.risk_factors)
      .map(([factor, data]: [string, any]) => `${factor}: ${data.score}pts (${data.description})`)
      .join(', ')}`

    return FRAUD_ASSESSMENT_PROMPT
      .replace('{transaction_id}', context.transaction_id)
      .replace('{amount_sek}', context.amount_sek.toString())
      .replace('{transaction_date}', context.transaction_date)
      .replace('{store_code}', context.store_code)
      .replace('{quality_score}', context.quality_score.toString())
      .replace('{reward_percentage}', context.reward_percentage.toString())
      .replace('{reward_amount_sek}', context.reward_amount_sek.toString())
      .replace('{phone_last4}', context.phone_last4)
      .replace('{customer_history}', customerHistory)
      .replace('{business_context}', businessContext)
      .replace('{temporal_context}', temporalContext)
      .replace('{base_risk_analysis}', baseRiskAnalysis)
  }

  private async callOpenAIAssessment(
    prompt: string,
    options?: AIAssessmentRequest['options']
  ): Promise<{
    risk_score: number
    risk_level: RiskLevel
    confidence: number
    recommendation: AIRecommendation
    reasoning: string[]
    suspicious_indicators: string[]
    confidence_factors: string[]
    tokens_used: number
    api_request_id?: string
  }> {
    const response = await openai.chat.completions.create({
      model: options?.model_version || this.modelVersion,
      messages: [
        {
          role: 'system',
          content: 'You are an expert fraud detection analyst. Respond only with valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 1000,
      temperature: 0.1,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('Empty response from OpenAI')
    }

    try {
      const parsed = JSON.parse(content)

      return {
        risk_score: parsed.risk_score,
        risk_level: parsed.risk_level,
        confidence: parsed.confidence,
        recommendation: parsed.recommendation,
        reasoning: parsed.reasoning || [],
        suspicious_indicators: parsed.suspicious_indicators || [],
        confidence_factors: parsed.confidence_factors || [],
        tokens_used: response.usage?.total_tokens || 0,
        api_request_id: response.id,
      }

    } catch (error) {
      throw new Error(`Failed to parse OpenAI response: ${error instanceof Error ? error.message : 'Invalid JSON'}`)
    }
  }

  private combineAssessments(
    baseAnalysis: any,
    aiResponse: any,
    context: TransactionContext
  ): {
    risk_score: number
    risk_level: RiskLevel
    confidence: number
    recommendation: AIRecommendation
    reasoning: string[]
    risk_factors: RiskFactors
  } {
    // Weight AI assessment more heavily but consider base analysis
    const combinedScore = Math.round((aiResponse.risk_score * 0.7) + (baseAnalysis.base_score * 0.3))

    // Use AI recommendation but validate against base analysis
    let finalRecommendation = aiResponse.recommendation
    if (baseAnalysis.base_score > 80 && aiResponse.recommendation === 'approve') {
      finalRecommendation = 'review' // Safety override
    }

    // Combine reasoning
    const combinedReasoning = [
      ...aiResponse.reasoning,
      ...aiResponse.suspicious_indicators.map((indicator: string) => `AI detected: ${indicator}`),
    ]

    return {
      risk_score: Math.min(100, Math.max(0, combinedScore)),
      risk_level: FraudRiskScoring.getRiskLevel(combinedScore),
      confidence: Math.min(aiResponse.confidence, 0.95), // Cap confidence at 95%
      recommendation: finalRecommendation,
      reasoning: combinedReasoning,
      risk_factors: baseAnalysis.risk_factors,
    }
  }

  private async detectPatterns(contexts: TransactionContext[]): Promise<PatternDetection[]> {
    if (contexts.length < 2) return []

    const transactions = contexts.map(ctx => ({
      transaction_id: ctx.transaction_id,
      amount_sek: ctx.amount_sek,
      transaction_date: ctx.transaction_date,
      store_code: ctx.store_code,
      quality_score: ctx.quality_score,
      phone_last4: ctx.phone_last4,
    }))

    return FraudPatternDetection.detectPatterns(transactions)
  }

  private async detectCrossTransactionPatterns(contexts: TransactionContext[]): Promise<PatternDetection[]> {
    if (contexts.length < 3) return []

    // Use AI for more sophisticated cross-transaction analysis
    const transactionsData = contexts.map(ctx => ({
      id: ctx.transaction_id,
      amount: ctx.amount_sek,
      date: ctx.transaction_date,
      store: ctx.store_code,
      quality: ctx.quality_score,
      customer: ctx.phone_last4,
    }))

    const prompt = PATTERN_ANALYSIS_PROMPT.replace(
      '{transactions_data}',
      JSON.stringify(transactionsData, null, 2)
    )

    try {
      const response = await openai.chat.completions.create({
        model: this.modelVersion,
        messages: [
          {
            role: 'system',
            content: 'You are a fraud pattern detection expert. Respond only with valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 1500,
        temperature: 0.1,
        response_format: { type: 'json_object' },
      })

      const content = response.choices[0]?.message?.content
      if (!content) return []

      const parsed = JSON.parse(content)
      return parsed.patterns_detected || []

    } catch (error) {
      // Fallback to local pattern detection
      return this.detectPatterns(contexts)
    }
  }

  private createFallbackAssessment(
    request: AIAssessmentRequest,
    assessmentId: string,
    errorMessage: string
  ): AIAssessmentResponse {
    const baseAnalysis = FraudRiskScoring.calculateBaseRiskScore(request.context)

    return {
      assessment_id: assessmentId,
      transaction_id: request.transaction_id,
      risk_score: Math.min(baseAnalysis.base_score + 20, 100), // Add safety margin
      risk_level: 'medium', // Conservative fallback
      confidence: 0.5, // Low confidence due to AI unavailability
      recommendation: baseAnalysis.base_score > 70 ? 'review' : 'approve',
      reasoning: [
        'AI service unavailable - using rule-based assessment',
        ...Object.values(baseAnalysis.risk_factors).map((factor: any) => factor.description),
      ],
      risk_factors: baseAnalysis.risk_factors as RiskFactors,
      ai_metadata: {
        model_version: 'fallback-rules',
        tokens_used: 0,
        response_time_ms: 0,
        prompt_version: 'fallback',
        assessment_timestamp: new Date().toISOString(),
        confidence_factors: ['rule-based-fallback'],
      },
      assessment_timestamp: new Date().toISOString(),
    }
  }

  private async storeAssessment(assessment: AIAssessmentResponse, businessId: string): Promise<void> {
    try {
      await this.supabase
        .from('fraud_assessments')
        .insert({
          id: assessment.assessment_id,
          transaction_id: assessment.transaction_id,
          business_id: businessId,
          risk_score: assessment.risk_score,
          risk_level: assessment.risk_level,
          confidence: assessment.confidence,
          recommendation: assessment.recommendation,
          reasoning: assessment.reasoning,
          risk_factors: assessment.risk_factors,
          ai_metadata: assessment.ai_metadata,
          assessed_at: assessment.assessment_timestamp,
        })
    } catch (error) {
      console.error('Failed to store fraud assessment:', error)
      // Don't throw - assessment should still be returned
    }
  }

  private async storeBatchResults(response: BatchAssessmentResponse): Promise<void> {
    // Store batch summary for analytics
    try {
      await this.supabase
        .from('fraud_assessment_batches')
        .insert({
          id: response.batch_id,
          business_id: response.business_id,
          total_transactions: response.total_transactions,
          completed_assessments: response.completed_assessments,
          failed_assessments: response.failed_assessments,
          processing_time_ms: response.processing_time_ms,
          ai_usage_summary: response.ai_usage_summary,
          batch_patterns: response.batch_patterns,
          created_at: new Date().toISOString(),
        })
    } catch (error) {
      console.error('Failed to store batch results:', error)
    }
  }

  private async createAuditLog(
    assessment: AIAssessmentResponse,
    businessId: string,
    additionalData?: Record<string, any>
  ): Promise<void> {
    try {
      const auditEntry = AuditLogger.createFraudAudit({
        event_type: 'fraud_assessment_completed',
        transaction_id: assessment.transaction_id,
        business_id: businessId,
        risk_score: assessment.risk_score,
        risk_level: assessment.risk_level,
        ai_confidence: assessment.confidence,
        patterns_detected: assessment.pattern_analysis?.map(p => p.pattern_type),
      })

      await this.supabase
        .from('audit_logs')
        .insert(auditEntry)
    } catch (error) {
      console.error('Failed to create audit log:', error)
    }
  }

  private async processSequentially<T>(promises: Promise<T>[]): Promise<T[]> {
    const results: T[] = []
    for (const promise of promises) {
      results.push(await promise)
    }
    return results
  }
}

// Export service instance for API routes
export const aiService = new AIFraudDetectionService()