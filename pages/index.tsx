import type { NextPage, GetServerSideProps } from 'next'
import Head from 'next/head'
import Dashboard from '@/components/Dashboard'
import { requireAuth } from '@/utils/auth.server'

interface HomeProps {
  user: {
    id: string
    name: string
    username: string
    createdAt: string
  }
}

const Home: NextPage<HomeProps> = ({ user: _user }) => {
  return (
    <>
      <Head>
        <title>Finance Management</title>
        <meta name="description" content="Personal finance management application" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Dashboard />
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  // Require authentication - redirects to login if not authenticated
  return requireAuth(context)
}

export default Home

