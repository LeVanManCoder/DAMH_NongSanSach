import { Outlet } from 'react-router-dom'
import Footer from '../components/Footer.jsx'
import Header from '../components/Header.jsx'

function MainLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

export default MainLayout
