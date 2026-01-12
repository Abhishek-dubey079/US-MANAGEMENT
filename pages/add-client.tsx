import dynamic from 'next/dynamic'
import type { NextPage } from 'next'

// Dynamically import AddClientPage with SSR disabled
// This ensures the component only renders on the client side
// No server-side code (auth, prisma, cookies) will run during build
const AddClientPage = dynamic(
  () => import('@/components/AddClientPage'),
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

const AddClient: NextPage = () => {
  return <AddClientPage />
}

export default AddClient
