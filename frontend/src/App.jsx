import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AdminLayout from './layouts/AdminLayout.jsx'
import { ConfirmProvider } from './components/ConfirmDialog.jsx'
import { AuthProvider } from './contexts/AuthProvider.jsx'
import MainLayout from './layouts/MainLayout.jsx'
import StaffLayout from './layouts/StaffLayout.jsx'
import SessionExpiredModal from './components/SessionExpiredModal.jsx'
import SkeletonBlock from './components/Skeletons.jsx'

const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage.jsx'))
const AdminProductsPage = lazy(() => import('./pages/admin/AdminProductsPage.jsx'))
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage.jsx'))
const AdminAuditLogsPage = lazy(() => import('./pages/admin/AdminAuditLogsPage.jsx'))
const BatchWasteDashboard = lazy(() => import('./pages/staff/BatchWasteDashboard.jsx'))
const StaffOrdersPage = lazy(() => import('./pages/staff/StaffOrdersPage.jsx'))
const StaffComplaintsPage = lazy(() => import('./pages/staff/StaffComplaintsPage.jsx'))
const CartPage = lazy(() => import('./pages/customer/CartPage.jsx'))
const CheckoutPage = lazy(() => import('./pages/customer/CheckoutPage.jsx'))
const ContactPage = lazy(() => import('./pages/customer/ContactPage.jsx'))
const HomePage = lazy(() => import('./pages/customer/HomePage.jsx'))
const ProductDetail = lazy(() => import('./pages/customer/ProductDetail.jsx'))
const LoginPage = lazy(() => import('./pages/customer/LoginPage.jsx'))
const ProductList = lazy(() => import('./pages/customer/ProductList.jsx'))
const RegisterPage = lazy(() => import('./pages/customer/RegisterPage.jsx'))
const AboutPage = lazy(() => import('./pages/customer/AboutPage.jsx'))
const OrdersPage = lazy(() => import('./pages/customer/OrdersPage.jsx'))
const ProfilePage = lazy(() => import('./pages/customer/ProfilePage.jsx'))
const SubscriptionsPage = lazy(() => import('./pages/customer/SubscriptionsPage.jsx'))
const TracePage = lazy(() => import('./pages/customer/TracePage.jsx'))

function RouteFallback() {
  return (
    <div className="route-fallback" role="status" aria-label="Đang tải trang">
      <SkeletonBlock className="h-7 w-1/3" />
      <SkeletonBlock className="h-4 w-2/3" />
      <SkeletonBlock className="h-40 w-full rounded-2xl" />
      <span className="sr-only">Đang tải trang…</span>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <ConfirmProvider>
        <AuthProvider>
          <SessionExpiredModal />
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<MainLayout />}>
                <Route index element={<HomePage />} />
                <Route path="products" element={<ProductList />} />
                <Route path="products/:slug" element={<ProductDetail />} />
                <Route path="login" element={<LoginPage />} />
                <Route path="register" element={<RegisterPage />} />
                <Route path="about" element={<AboutPage />} />
                <Route path="contact" element={<ContactPage />} />
                <Route path="trace/:qrCode" element={<TracePage />} />
                <Route path="cart" element={<CartPage />} />
                <Route path="checkout" element={<CheckoutPage />} />
                <Route path="orders" element={<OrdersPage />} />
                <Route path="orders/:orderId" element={<OrdersPage />} />
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
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboardPage />} />
                <Route path="products" element={<AdminProductsPage />} />
                <Route path="users" element={<AdminUsersPage />} />
                <Route path="audit-logs" element={<AdminAuditLogsPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </ConfirmProvider>
    </BrowserRouter>
  )
}

export default App
