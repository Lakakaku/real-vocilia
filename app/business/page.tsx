import { redirect } from 'next/navigation'

export default function BusinessHomePage() {
  // Redirect to login page as the default for business subdomain
  redirect('/login')
}