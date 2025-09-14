import { redirect } from 'next/navigation'

export default function AdminHomePage() {
  // Redirect to login page as the default for admin subdomain
  redirect('/login')
}