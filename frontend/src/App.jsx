import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthProvider.jsx'
import BatchWasteDashboard from './pages/staff/BatchWasteDashboard.jsx'
import StaffOrdersPage from './pages/staff/StaffOrdersPage.jsx'
import StaffComplaintsPage from './pages/staff/StaffComplaintsPage.jsx'
import CartPage from './pages/customer/CartPage.jsx'
import CheckoutPage from './pages/customer/CheckoutPage.jsx'
import HomePage from './pages/customer/HomePage.jsx'
import ProductDetail from './pages/customer/ProductDetail.jsx'
import LoginPage from './pages/customer/LoginPage.jsx'
import ProductList from './pages/customer/ProductList.jsx'
import OrdersPage from './pages/customer/OrdersPage.jsx'
import ProfilePage from './pages/customer/ProfilePage.jsx'
import SubscriptionsPage from './pages/customer/SubscriptionsPage.jsx'
import TracePage from './pages/customer/TracePage.jsx'
import MainLayout from './layouts/MainLayout.jsx'
import StaffLayout from './layouts/StaffLayout.jsx'
import SessionExpiredModal from './components/SessionExpiredModal.jsx'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SessionExpiredModal />
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<HomePage />} />
            <Route path="products" element={<ProductList />} />
            <Route path="products/:slug" element={<ProductDetail />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="trace/:qrCode" element={<TracePage />} />
            <Route path="cart" element={<CartPage />} />
            <Route path="checkout" element={<CheckoutPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="subscriptions" element={<SubscriptionsPage />} />
          </Route>
          <Route path="/staff" element={<StaffLayout />}>
            <Route index element={<BatchWasteDashboard />} />
            <Route path="batches" element={<BatchWasteDashboard />} />
            <Route path="orders" element={<StaffOrdersPage />} />
            <Route path="complaints" element={<StaffComplaintsPage />} />
            <Route path="batches/waste" element={<BatchWasteDashboard />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
