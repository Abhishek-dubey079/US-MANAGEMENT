/**
 * Reusable loading spinner component
 */

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  className?: string
}

export default function LoadingSpinner({ 
  size = 'md', 
  text,
  className = '' 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  }

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className={`${sizeClasses[size]} animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent`}></div>
      {text && <p className="mt-4 text-sm text-gray-600">{text}</p>}
    </div>
  )
}





