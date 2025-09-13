import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Vocilia Business - Customer Feedback Platform',
  description: 'Manage your business feedback and analytics on Vocilia',
}

export default function BusinessLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}