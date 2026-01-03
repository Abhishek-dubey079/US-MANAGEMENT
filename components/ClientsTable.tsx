import { useRouter } from 'next/router'
import { Client } from '@/types'
import { KEYWORDS, highlightText } from '@/utils/search.utils'
import { useMemo } from 'react'

interface ClientsTableProps {
  clients: Client[]
  searchQuery?: string
}

export default function ClientsTable({ clients, searchQuery = '' }: ClientsTableProps) {
  const router = useRouter()

  const handleRowClick = (clientId: string) => {
    router.push(`/client/${clientId}`)
  }

  // Get highlighted client names
  const highlightedNames = useMemo(() => {
    return clients.map((client) => ({
      ...client,
      highlightedName: highlightText(client.name, searchQuery, KEYWORDS),
    }))
  }, [clients, searchQuery])

  return (
    <div className="overflow-x-auto -mx-6 sm:mx-0">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
              Serial No
            </th>
            <th className="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
              PAN Number
            </th>
            <th className="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
              Client/Company Name
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {highlightedNames.map((client, index) => (
            <tr
              key={client.id}
              onClick={() => handleRowClick(client.id)}
              className="cursor-pointer hover:bg-gray-50"
            >
              <td className="whitespace-nowrap px-4 sm:px-6 py-4 text-sm font-medium text-gray-900">
                {index + 1}
              </td>
              <td className="whitespace-nowrap px-4 sm:px-6 py-4 text-sm font-mono text-gray-700">
                {client.pan || <span className="text-gray-400">-</span>}
              </td>
              <td className="whitespace-nowrap px-4 sm:px-6 py-4 text-sm font-medium text-gray-900">
                <span dangerouslySetInnerHTML={{ __html: client.highlightedName || client.name }} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

