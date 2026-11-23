import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import BatchWasteDashboard from './pages/staff/BatchWasteDashboard.jsx'
import ProductDetail from './pages/customer/ProductDetail.jsx'
import MainLayout from './layouts/MainLayout.jsx'
import StaffLayout from './layouts/StaffLayout.jsx'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<ProductDetail />} />
          <Route path="products/:productId" element={<ProductDetail />} />
        </Route>
        <Route path="/staff" element={<StaffLayout />}>
          <Route index element={<BatchWasteDashboard />} />
          <Route path="batches/waste" element={<BatchWasteDashboard />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
