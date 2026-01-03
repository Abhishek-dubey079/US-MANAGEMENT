/**
 * Reusable section card component with consistent styling
 */

interface SectionCardProps {
  title: string
  children: React.ReactNode
  headerClassName?: string
  className?: string
  borderColor?: 'default' | 'yellow' | 'red' | 'green'
}

export default function SectionCard({ 
  title, 
  children,
  headerClassName = '',
  className = '',
  borderColor = 'default'
}: SectionCardProps) {
  const borderClasses = {
    default: 'border-gray-200',
    yellow: 'border-2 border-yellow-200',
    red: 'border-2 border-red-200',
    green: 'border-2 border-green-200',
  }

  const headerBgClasses = {
    default: 'bg-white',
    yellow: 'bg-yellow-50',
    red: 'bg-red-50',
    green: 'bg-green-50',
  }

  return (
    <div className={`rounded-lg bg-white shadow-sm border ${borderClasses[borderColor]} ${className}`}>
      <div className={`border-b ${borderClasses[borderColor]} ${headerBgClasses[borderColor]} px-4 sm:px-6 py-3.5 ${headerClassName}`}>
        <h2 className="text-base font-semibold text-gray-900 tracking-tight">{title}</h2>
      </div>
      <div className="p-4 sm:p-6">
        {children}
      </div>
    </div>
  )
}


