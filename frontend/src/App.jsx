import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthProvider.jsx'
import BatchWasteDashboard from './pages/staff/BatchWasteDashboard.jsx'
import StaffOrdersPage from './pages/staff/StaffOrdersPage.jsx'
import CartPage from './pages/customer/CartPage.jsx'
import CheckoutPage from './pages/customer/CheckoutPage.jsx'
import ProductDetail from './pages/customer/ProductDetail.jsx'
import LoginPage from './pages/customer/LoginPage.jsx'
import ProductList from './pages/customer/ProductList.jsx'
import OrdersPage from './pages/customer/OrdersPage.jsx'
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
            <Route index element={<ProductList />} />
            <Route path="products" element={<ProductList />} />
            <Route path="products/:slug" element={<ProductDetail />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="trace/:qrCode" element={<TracePage />} />
            <Route path="cart" element={<CartPage />} />
            <Route path="checkout" element={<CheckoutPage />} />
            <Route path="orders" element={<OrdersPage />} />
          </Route>
          <Route path="/staff" element={<StaffLayout />}>
            <Route index element={<BatchWasteDashboard />} />
            <Route path="orders" element={<StaffOrdersPage />} />
            <Route path="batches/waste" element={<BatchWasteDashboard />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
