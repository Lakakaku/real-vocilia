'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('profile')
  const [businessInfo, setBusinessInfo] = useState({
    name: '',
    email: '',
    phone: '',
    org_number: '',
    address: '',
    city: '',
    postal_code: '',
  })
  const [notifications, setNotifications] = useState({
    email_feedback: true,
    email_verification: true,
    email_weekly_report: true,
    sms_alerts: false,
  })
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    checkAuthAndLoadSettings()
  }, [])

  const checkAuthAndLoadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/business/login')
        return
      }

      // Load business settings
      // TODO: Implement actual settings loading from database
      setBusinessInfo({
        name: 'Example Business AB',
        email: user.email || '',
        phone: '08-123 45 67',
        org_number: '556677-8899',
        address: 'Kungsgatan 1',
        city: 'Stockholm',
        postal_code: '111 43',
      })

      setLoading(false)
    } catch (error) {
      console.error('Error loading settings:', error)
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    // TODO: Implement actual profile saving
    alert('Profile settings saved successfully!')
  }

  const handleSaveNotifications = async () => {
    // TODO: Implement actual notification settings saving
    alert('Notification settings saved successfully!')
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/business/login')
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
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">
          Manage your business profile and account preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-2">
            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full text-left px-4 py-2 rounded ${
                activeTab === 'profile' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'
              }`}
            >
              Business Profile
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`w-full text-left px-4 py-2 rounded ${
                activeTab === 'notifications' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'
              }`}
            >
              Notifications
            </button>
            <button
              onClick={() => setActiveTab('billing')}
              className={`w-full text-left px-4 py-2 rounded ${
                activeTab === 'billing' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'
              }`}
            >
              Billing & Plan
            </button>
            <button
              onClick={() => setActiveTab('integrations')}
              className={`w-full text-left px-4 py-2 rounded ${
                activeTab === 'integrations' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'
              }`}
            >
              Integrations
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`w-full text-left px-4 py-2 rounded ${
                activeTab === 'security' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'
              }`}
            >
              Security
            </button>
          </div>

          <button
            onClick={handleSignOut}
            className="w-full mt-4 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg"
          >
            Sign Out
          </button>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          {activeTab === 'profile' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-6">Business Profile</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Business Name
                  </label>
                  <input
                    type="text"
                    value={businessInfo.name}
                    onChange={(e) => setBusinessInfo({ ...businessInfo, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Organization Number
                  </label>
                  <input
                    type="text"
                    value={businessInfo.org_number}
                    onChange={(e) => setBusinessInfo({ ...businessInfo, org_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={businessInfo.email}
                    onChange={(e) => setBusinessInfo({ ...businessInfo, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={businessInfo.phone}
                    onChange={(e) => setBusinessInfo({ ...businessInfo, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={businessInfo.address}
                    onChange={(e) => setBusinessInfo({ ...businessInfo, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={businessInfo.city}
                    onChange={(e) => setBusinessInfo({ ...businessInfo, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    value={businessInfo.postal_code}
                    onChange={(e) => setBusinessInfo({ ...businessInfo, postal_code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={handleSaveProfile}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-6">Notification Preferences</h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <p className="font-medium">New Feedback Alerts</p>
                    <p className="text-sm text-gray-600">Get notified when customers leave feedback</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={notifications.email_feedback}
                      onChange={(e) => setNotifications({ ...notifications, email_feedback: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <p className="font-medium">Verification Reminders</p>
                    <p className="text-sm text-gray-600">Reminders for pending payment verifications</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={notifications.email_verification}
                      onChange={(e) => setNotifications({ ...notifications, email_verification: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <p className="font-medium">Weekly Reports</p>
                    <p className="text-sm text-gray-600">Receive weekly analytics summary</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={notifications.email_weekly_report}
                      onChange={(e) => setNotifications({ ...notifications, email_weekly_report: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <p className="font-medium">SMS Alerts</p>
                    <p className="text-sm text-gray-600">Get important alerts via SMS</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={notifications.sms_alerts}
                      onChange={(e) => setNotifications({ ...notifications, sms_alerts: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={handleSaveNotifications}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save Preferences
                </button>
              </div>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-6">Billing & Plan</h2>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-blue-900">Current Plan: Starter</h3>
                    <p className="text-blue-700 mt-1">Perfect for small businesses</p>
                    <ul className="mt-3 space-y-1 text-sm text-blue-700">
                      <li>✓ Up to 3 store locations</li>
                      <li>✓ 500 feedbacks per month</li>
                      <li>✓ Basic analytics</li>
                      <li>✓ Email support</li>
                    </ul>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-blue-900">299 SEK</p>
                    <p className="text-sm text-blue-700">per month</p>
                  </div>
                </div>
              </div>

              <button className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                Upgrade Plan
              </button>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-6">Integrations</h2>

              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                        <span className="text-xl">🏪</span>
                      </div>
                      <div>
                        <p className="font-medium">Square POS</p>
                        <p className="text-sm text-gray-600">Sync transactions automatically</p>
                      </div>
                    </div>
                    <button className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded">
                      Connect
                    </button>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                        <span className="text-xl">🛒</span>
                      </div>
                      <div>
                        <p className="font-medium">Shopify</p>
                        <p className="text-sm text-gray-600">Import online orders</p>
                      </div>
                    </div>
                    <button className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded">
                      Connect
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-6">Security</h2>

              <div className="space-y-6">
                <div>
                  <h3 className="font-medium mb-3">Change Password</h3>
                  <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50">
                    Update Password
                  </button>
                </div>

                <div>
                  <h3 className="font-medium mb-3">Two-Factor Authentication</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Add an extra layer of security to your account
                  </p>
                  <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                    Enable 2FA
                  </button>
                </div>

                <div>
                  <h3 className="font-medium mb-3">API Keys</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Manage API keys for integrations
                  </p>
                  <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50">
                    Manage API Keys
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}