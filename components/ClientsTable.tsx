import { useRouter } from 'next/router'
import { ClientWithWorks } from '@/types'
import { KEYWORDS, highlightText, highlightWorkPurpose, findMatchingKeyword } from '@/utils/search.utils'
import { useMemo } from 'react'

interface ClientsTableProps {
  clients: ClientWithWorks[]
  searchQuery?: string
}

export default function ClientsTable({ clients, searchQuery = '' }: ClientsTableProps) {
  const router = useRouter()

  const handleRowClick = (clientId: string) => {
    router.push(`/client/${clientId}`)
  }

  // Get highlighted client names and matching work purposes
  const highlightedData = useMemo(() => {
    const lowerQuery = searchQuery.toLowerCase().trim()
    const matchingKeyword = findMatchingKeyword(searchQuery, KEYWORDS)
    
    return clients.map((client) => {
      // Find matching work purposes
      const matchingWorks = client.works?.filter((work: any) => {
        if (!work.purpose) return false
        const lowerPurpose = work.purpose.toLowerCase()
        if (matchingKeyword) {
          return lowerPurpose.includes(matchingKeyword.toLowerCase())
        }
        return lowerPurpose.includes(lowerQuery)
      }) || []
      
      // Highlight matching work purposes
      const highlightedWorks = matchingWorks.map((work: any) => ({
        ...work,
        highlightedPurpose: highlightWorkPurpose(work.purpose, searchQuery, KEYWORDS),
      }))
      
      return {
        ...client,
        highlightedName: highlightText(client.name, searchQuery, KEYWORDS),
        matchingWorks: highlightedWorks,
      }
    })
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
            {searchQuery && (
              <th className="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                Matching Works
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {highlightedData.map((client, index) => (
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
              <td className="px-4 sm:px-6 py-4 text-sm font-medium text-gray-900">
                <div>
                  <span dangerouslySetInnerHTML={{ __html: client.highlightedName || client.name }} />
                </div>
              </td>
              {searchQuery && (
                <td className="px-4 sm:px-6 py-4 text-sm text-gray-700">
                  {client.matchingWorks && client.matchingWorks.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {client.matchingWorks.map((work: any, workIndex: number) => (
                        <span
                          key={work.id || workIndex}
                          className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800"
                          title={work.purpose}
                        >
                          <span dangerouslySetInnerHTML={{ __html: work.highlightedPurpose || work.purpose }} />
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

