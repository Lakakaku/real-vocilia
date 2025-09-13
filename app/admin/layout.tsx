import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Vocilia Admin',
  description: 'Admin dashboard for Vocilia platform operations',
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Navigation */}
      <nav className="bg-gray-900 text-white">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-bold">Vocilia Admin</h1>
              <div className="hidden md:flex space-x-4">
                <a href="/admin/dashboard" className="hover:bg-gray-800 px-3 py-2 rounded">
                  Dashboard
                </a>
                <a href="/admin/businesses" className="hover:bg-gray-800 px-3 py-2 rounded">
                  Businesses
                </a>
                <a href="/admin/payments" className="hover:bg-gray-800 px-3 py-2 rounded">
                  Payments
                </a>
                <a href="/admin/feedback" className="hover:bg-gray-800 px-3 py-2 rounded">
                  Feedback
                </a>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm bg-red-600 px-2 py-1 rounded">ADMIN</span>
              <button className="hover:bg-gray-800 px-3 py-2 rounded">
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>{children}</main>
    </div>
  )
}