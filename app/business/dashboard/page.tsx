import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { logout } from '@/lib/auth/actions'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch business data
  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Vocilia Business Dashboard</h1>
            <form action={logout}>
              <Button type="submit" variant="outline">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Welcome back!</CardTitle>
              <CardDescription>
                {business?.name || user.email}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Your account has been successfully set up. Start by completing your business context to begin receiving valuable customer feedback.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Get started with Vocilia</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" variant="outline">
                Complete Business Context
              </Button>
              <Button className="w-full" variant="outline">
                Generate Store QR Code
              </Button>
              <Button className="w-full" variant="outline">
                View Settings
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account Status</CardTitle>
              <CardDescription>Your subscription details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <span className="text-sm font-medium">
                    {business?.subscription_status || 'Trial'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Email:</span>
                  <span className="text-sm font-medium">{user.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Verified:</span>
                  <span className="text-sm font-medium">
                    {user.email_confirmed_at ? 'Yes' : 'Pending'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {!business?.onboarding_completed && (
          <div className="mt-6">
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-blue-900">Complete Your Setup</CardTitle>
                <CardDescription className="text-blue-700">
                  You&apos;re almost ready to start receiving customer feedback!
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-blue-700 mb-4">
                  Complete the onboarding process to unlock all features and start collecting valuable insights from your customers.
                </p>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  Start Onboarding
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}