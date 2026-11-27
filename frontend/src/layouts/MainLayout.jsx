import { Outlet } from 'react-router-dom'
import Footer from '../components/Footer.jsx'
import Header from '../components/Header.jsx'

function MainLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-[#faf8ed]">
      <Header />
      <main className="storefront-main mx-auto w-full max-w-[1320px] flex-1 px-4 py-7 sm:px-6 sm:py-10">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

export default MainLayout
