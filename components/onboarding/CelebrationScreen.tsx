'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, Trophy, Sparkles, Gift, Rocket, ArrowRight, QrCode, FileText, Users, AlertCircle, RefreshCw } from 'lucide-react'
import { useContextInitialization } from '@/hooks/useContextInitialization'

interface CelebrationScreenProps {
  businessId: string
  onComplete: () => void
}

export function CelebrationScreen({ businessId, onComplete }: CelebrationScreenProps) {
  const [showConfetti, setShowConfetti] = useState(false)
  const [animateIn, setAnimateIn] = useState(false)
  const [showContextStep, setShowContextStep] = useState(false)

  // Initialize context after onboarding completion
  const [contextState, contextActions] = useContextInitialization({
    businessId,
    autoCheck: false, // We'll trigger this manually after celebration
    onSuccess: (result) => {
      console.log('Context initialized successfully:', result)
    },
    onError: (error) => {
      console.error('Context initialization failed:', error)
    },
  })

  useEffect(() => {
    // Trigger animations
    setShowConfetti(true)
    setTimeout(() => setAnimateIn(true), 100)

    // Show context initialization step after initial celebration
    const contextTimer = setTimeout(() => {
      setShowContextStep(true)
      contextActions.initialize()
    }, 3000)

    // Clean up confetti after animation
    const confettiTimer = setTimeout(() => setShowConfetti(false), 5000)
    
    return () => {
      clearTimeout(contextTimer)
      clearTimeout(confettiTimer)
    }
  }, [contextActions])

  const nextSteps = [
    {
      icon: <QrCode className="w-5 h-5" />,
      title: 'Display QR Codes',
      description: 'Print and display your unique QR codes in-store',
      action: 'Go to Stores',
      link: '/business/stores'
    },
    {
      icon: <FileText className="w-5 h-5" />,
      title: 'Complete Context',
      description: 'Add more details to maximize feedback quality',
      action: 'Context Manager',
      link: '/business/context'
    },
    {
      icon: <Users className="w-5 h-5" />,
      title: 'Train Your Team',
      description: 'Show staff how to encourage feedback',
      action: 'View Guide',
      link: '/business/training'
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-green-50 flex items-center justify-center p-4">
      {/* Confetti Effect (CSS only) */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-fall"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 2}s`
              }}
            >
              <div
                className={`w-2 h-2 ${
                  ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-yellow-500', 'bg-pink-500'][
                    Math.floor(Math.random() * 5)
                  ]
                } rounded-full`}
              />
            </div>
          ))}
        </div>
      )}

      <div className={`max-w-2xl w-full space-y-8 transition-all duration-1000 ${
        animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}>
        {/* Trophy Animation */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 shadow-xl animate-bounce">
            <Trophy className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Congratulations! 🎉
          </h1>
          <p className="text-xl text-gray-600">
            Your business is now ready to collect powerful customer insights
          </p>
        </div>

        {/* Achievement Card */}
        <Card className="border-2 border-purple-200 bg-white/90 backdrop-blur">
          <CardContent className="p-8">
            <div className="text-center space-y-6">
              <div className="flex justify-center space-x-4">
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-2">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <span className="text-sm font-medium">Setup Complete</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-2">
                    <Sparkles className="w-8 h-8 text-blue-600" />
                  </div>
                  <span className="text-sm font-medium">AI Ready</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mb-2">
                    <Gift className="w-8 h-8 text-purple-600" />
                  </div>
                  <span className="text-sm font-medium">Rewards Active</span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t">
                <div>
                  <p className="text-2xl font-bold text-green-600">100%</p>
                  <p className="text-sm text-gray-600">Profile Complete</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">6/6</p>
                  <p className="text-sm text-gray-600">Steps Finished</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-600">
                    {contextState.isInitialized ? 'Ready' : 'Setting Up'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {contextState.isInitialized ? 'To Launch' : 'Context'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Context Initialization Progress */}
        {showContextStep && (
          <Card className="bg-white/90 backdrop-blur animate-in slide-in-from-bottom duration-500">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      contextState.isInitialized ? 'bg-green-100' :
                      contextState.error ? 'bg-red-100' :
                      'bg-blue-100'
                    }`}>
                      {contextState.isInitialized ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : contextState.error ? (
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      ) : contextState.isInitializing ? (
                        <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                      ) : (
                        <Sparkles className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold">
                        {contextState.isInitialized ? 'Context Ready!' : 
                         contextState.error ? 'Context Setup Failed' : 
                         'Setting up your business context...'}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {contextState.message || contextState.currentStage}
                      </p>
                    </div>
                  </div>
                  
                  {contextState.canRetry && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={contextActions.retry}
                      disabled={contextState.isInitializing}
                    >
                      Retry
                    </Button>
                  )}
                </div>

                {/* Progress Bar */}
                {contextState.isInitializing && (
                  <div className="space-y-2">
                    <Progress value={contextState.progress} className="w-full" />
                    <p className="text-xs text-gray-500 text-center">
                      {contextState.progress}% complete
                    </p>
                  </div>
                )}

                {/* Success Details */}
                {contextState.isInitialized && contextState.completenessScore && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-green-800">
                        Context Completeness
                      </span>
                      <span className="text-lg font-bold text-green-600">
                        {contextState.completenessScore}%
                      </span>
                    </div>
                    <div className="mt-2">
                      <Progress 
                        value={contextState.completenessScore} 
                        className="w-full h-2" 
                      />
                    </div>
                  </div>
                )}

                {/* Error Details */}
                {contextState.error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-800">
                      {contextState.error}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Next Steps */}
        <Card className="bg-white/90 backdrop-blur">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Rocket className="w-5 h-5 mr-2 text-orange-500" />
              Your Next Steps
            </h3>
            <div className="space-y-3">
              {nextSteps.map((step, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    {step.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{step.title}</h4>
                    <p className="text-sm text-gray-600">{step.description}</p>
                  </div>
                  <Button size="sm" variant="ghost" className="flex-shrink-0">
                    {step.action}
                    <ArrowRight className="ml-1 w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* CTA Button */}
        <div className="text-center">
          <Button
            size="lg"
            onClick={onComplete}
            disabled={contextState.isInitializing}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-6 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {contextState.isInitializing ? (
              <>
                <RefreshCw className="mr-2 w-5 h-5 animate-spin" />
                Setting up context...
              </>
            ) : (
              <>
                Go to Dashboard
                <ArrowRight className="ml-2 w-5 h-5" />
              </>
            )}
          </Button>
          <p className="text-sm text-gray-600 mt-4">
            {contextState.isInitializing ? (
              'Please wait while we set up your business context...'
            ) : contextState.error ? (
              'You can continue to your dashboard and set up context later'
            ) : (
              'You can always return to complete additional setup from your dashboard'
            )}
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes fall {
          to {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }

        .animate-fall {
          animation: fall linear forwards;
        }
      `}</style>
    </div>
  )
}