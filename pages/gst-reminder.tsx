import type { NextPage, GetServerSideProps } from 'next'
import Head from 'next/head'
import { useRouter } from 'next/router'
import GstReminder from '@/components/GstReminder'
import { requireAuth } from '@/utils/auth.server'

interface GstReminderPageProps {
    user: {
        id: string
        name: string
        username: string
    }
}

const GstReminderPage: NextPage<GstReminderPageProps> = () => {
    const router = useRouter()

    return (
        <>
            <Head>
                <title>GST Reminder | Finance Management</title>
            </Head>
            <div className="min-h-screen bg-gray-50">
                <div className="container mx-auto px-4 py-8">
                    <div className="mb-8">
                        <button
                            onClick={() => router.push('/')}
                            className="flex items-center text-sm text-blue-600 hover:text-blue-800 transition-colors"
                        >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back to Dashboard
                        </button>
                    </div>
                    <GstReminder />
                </div>
            </div>
        </>
    )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
    return requireAuth(context)
}

export default GstReminderPage
