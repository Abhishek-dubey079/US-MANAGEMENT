import dynamic from 'next/dynamic'
import type { NextPage } from 'next'

// Dynamically import AddClient with SSR disabled
// This ensures the component only renders on the client side
// No server-side code will run during build
const AddClient = dynamic(
  () => import('@/components/AddClient.client'),
  {
    ssr: false, // Disable server-side rendering
    loading: () => (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    ),
  }
)

const AddClientPage: NextPage = () => {
  return <AddClient />
}

export default AddClientPage
