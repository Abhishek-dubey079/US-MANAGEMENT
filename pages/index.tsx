import type { NextPage } from 'next'
import Head from 'next/head'
import Dashboard from '@/components/Dashboard'

const Home: NextPage = () => {
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

export default Home

