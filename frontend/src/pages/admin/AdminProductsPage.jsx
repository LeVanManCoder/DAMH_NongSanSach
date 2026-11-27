import { useCallback, useEffect, useState } from 'react'
import adminApi from '../../api/adminApi.js'
import Button from '../../components/Button.jsx'
import LoadingSpinner from '../../components/LoadingSpinner.jsx'
import ToastNotification from '../../components/ToastNotification.jsx'

const emptyCategory = {
  ten_danh_muc: '',
  mo_ta: '',
  trang_thai: 'dang_ban',
}

const emptyProduct = {
  ten_san_pham: '',
  category_id: '',
  gia_ban: '',
  don_vi_tinh: 'kg',
  mo_ta: '',
  trang_thai: 'dang_ban',
}

function AdminProductsPage() {
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [categoryForm, setCategoryForm] = useState(emptyCategory)
  const [productForm, setProductForm] = useState(emptyProduct)
  const [editingCategoryId, setEditingCategoryId] = useState(null)
  const [editingProductId, setEditingProductId] = useState(null)
  const [productImage, setProductImage] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [savingCategory, setSavingCategory] = useState(false)
  const [savingProduct, setSavingProduct] = useState(false)
  const [busyItem, setBusyItem] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [toast, setToast] = useState(null)

  const fetchCatalog = useCallback(async () => {
      const [categoryResponse, productResponse] = await Promise.all([
        adminApi.getCategories({ per_page: 100 }),
        adminApi.getProducts({ per_page: 100 }),
      ])
      return {
        categories: categoryResponse.data.data,
        products: productResponse.data.data,
      }
  }, [])

  const loadCatalog = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage('')
    try {
      const catalog = await fetchCatalog()
      setCategories(catalog.categories)
      setProducts(catalog.products)
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ?? 'Không tải được danh mục và sản phẩm.',
      )
    } finally {
      setIsLoading(false)
    }
  }, [fetchCatalog])

  useEffect(() => {
    let active = true
    fetchCatalog()
      .then((catalog) => {
        if (active) {
          setCategories(catalog.categories)
          setProducts(catalog.products)
        }
      })
      .catch((error) => {
        if (active) {
          setErrorMessage(
            error.response?.data?.message ?? 'Không tải được danh mục và sản phẩm.',
          )
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [fetchCatalog])

  function editCategory(category) {
    setEditingCategoryId(category.id)
    setCategoryForm({
      ten_danh_muc: category.ten_danh_muc,
      mo_ta: category.mo_ta ?? '',
      trang_thai: category.trang_thai,
    })
  }

  function resetCategoryForm() {
    setEditingCategoryId(null)
    setCategoryForm(emptyCategory)
  }

  function editProduct(product) {
    setEditingProductId(product.id)
    setProductForm({
      ten_san_pham: product.ten_san_pham,
      category_id: String(product.category_id),
      gia_ban: String(product.gia_ban),
      don_vi_tinh: product.don_vi_tinh,
      mo_ta: product.mo_ta ?? '',
      trang_thai: product.trang_thai,
    })
    setProductImage(null)
  }

  function resetProductForm() {
    setEditingProductId(null)
    setProductForm(emptyProduct)
    setProductImage(null)
  }

  async function submitCategory(event) {
    event.preventDefault()
    setSavingCategory(true)
    setToast(null)
    try {
      const request = editingCategoryId
        ? adminApi.updateCategory(editingCategoryId, categoryForm)
        : adminApi.createCategory(categoryForm)
      await request
      resetCategoryForm()
      setToast({
        message: editingCategoryId ? 'Đã cập nhật danh mục.' : 'Đã tạo danh mục.',
        type: 'success',
      })
      await loadCatalog()
    } catch (error) {
      setToast({
        message: error.response?.data?.errors?.ten_danh_muc?.[0]
          ?? error.response?.data?.message
          ?? 'Không lưu được danh mục.',
        type: 'error',
      })
    } finally {
      setSavingCategory(false)
    }
  }

  async function submitProduct(event) {
    event.preventDefault()
    setSavingProduct(true)
    setToast(null)
    const formData = new FormData()
    Object.entries(productForm).forEach(([key, value]) => formData.append(key, value))
    if (productImage) {
      formData.append('hinh_anh_dai_dien', productImage)
    }
    if (editingProductId) {
      formData.append('_method', 'PUT')
    }

    try {
      if (editingProductId) {
        await adminApi.updateProduct(editingProductId, formData)
      } else {
        await adminApi.createProduct(formData)
      }
      resetProductForm()
      setToast({
        message: editingProductId ? 'Đã cập nhật sản phẩm.' : 'Đã tạo sản phẩm.',
        type: 'success',
      })
      await loadCatalog()
    } catch (error) {
      const firstValidationError = Object.values(error.response?.data?.errors ?? {})
        .flat()
        .find(Boolean)
      setToast({
        message: firstValidationError
          ?? error.response?.data?.message
          ?? 'Không lưu được sản phẩm.',
        type: 'error',
      })
    } finally {
      setSavingProduct(false)
    }
  }

  async function deleteCategory(category) {
    if (!window.confirm(`Xóa danh mục "${category.ten_danh_muc}"?`)) {
      return
    }
    setBusyItem(`category-${category.id}`)
    try {
      await adminApi.deleteCategory(category.id)
      setToast({ message: 'Đã xóa danh mục.', type: 'success' })
      await loadCatalog()
    } catch (error) {
      setToast({
        message: error.response?.data?.message ?? 'Không thể xóa danh mục này.',
        type: 'error',
      })
    } finally {
      setBusyItem(null)
    }
  }

  async function deleteProduct(product) {
    if (!window.confirm(`Xóa sản phẩm "${product.ten_san_pham}"?`)) {
      return
    }
    setBusyItem(`product-${product.id}`)
    try {
      await adminApi.deleteProduct(product.id)
      setToast({ message: 'Đã xóa sản phẩm.', type: 'success' })
      await loadCatalog()
    } catch (error) {
      setToast({
        message: error.response?.data?.message ?? 'Không thể xóa sản phẩm này.',
        type: 'error',
      })
    } finally {
      setBusyItem(null)
    }
  }

  return (
    <section>
      {toast && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <header className="page-heading mb-6 py-1">
        <p className="section-kicker">
          Quản trị hệ thống
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Sản phẩm & danh mục
        </h1>
      </header>

      {errorMessage && (
        <p className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-800" role="alert">
          {errorMessage}
        </p>
      )}

      {isLoading ? (
        <div className="flex min-h-48 items-center justify-center">
          <LoadingSpinner label="Đang tải danh mục và sản phẩm" className="text-green-700" />
        </div>
      ) : (
        <div className="space-y-8">
          <section className="grid gap-6 xl:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.2fr)]">
            <form onSubmit={submitCategory} className="form-panel space-y-4 rounded-2xl bg-white p-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingCategoryId ? 'Sửa danh mục' : 'Thêm danh mục'}
                </h2>
                <p className="mt-1 text-sm text-slate-600">Quản lý nhóm sản phẩm đang bán.</p>
              </div>
              <label className="block text-sm font-medium text-slate-700">
                Tên danh mục
                <input
                  required
                  maxLength="100"
                  value={categoryForm.ten_danh_muc}
                  onChange={(event) => setCategoryForm({ ...categoryForm, ten_danh_muc: event.target.value })}
                  className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Mô tả
                <textarea
                  maxLength="255"
                  value={categoryForm.mo_ta}
                  onChange={(event) => setCategoryForm({ ...categoryForm, mo_ta: event.target.value })}
                  className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 p-3"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Trạng thái
                <select
                  value={categoryForm.trang_thai}
                  onChange={(event) => setCategoryForm({ ...categoryForm, trang_thai: event.target.value })}
                  className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"
                >
                  <option value="dang_ban">Đang hoạt động</option>
                  <option value="ngung_ban">Ngừng hoạt động</option>
                </select>
              </label>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={savingCategory}>
                  {savingCategory ? <LoadingSpinner label="Đang lưu danh mục" className="mr-2" /> : null}
                  {savingCategory ? 'Đang lưu...' : editingCategoryId ? 'Lưu danh mục' : 'Tạo danh mục'}
                </Button>
                {editingCategoryId && (
                  <Button variant="secondary" onClick={resetCategoryForm}>Hủy sửa</Button>
                )}
              </div>
            </form>

            <div className="dashboard-panel overflow-x-auto rounded-2xl bg-white">
              <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Danh mục</th>
                    <th className="px-4 py-3">Sản phẩm</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {categories.map((category) => (
                    <tr key={category.id}>
                      <td className="px-4 py-4 font-semibold text-slate-900">{category.ten_danh_muc}</td>
                      <td className="px-4 py-4 text-slate-600">{category.products_count ?? 0}</td>
                      <td className="px-4 py-4 text-slate-600">
                        {category.trang_thai === 'dang_ban' ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          <Button variant="secondary" onClick={() => editCategory(category)}>Sửa</Button>
                          <Button
                            variant="secondary"
                            onClick={() => deleteCategory(category)}
                            disabled={busyItem !== null}
                          >
                            {busyItem === `category-${category.id}` ? 'Đang xóa...' : 'Xóa'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {categories.length === 0 && (
                    <tr><td colSpan="4" className="px-4 py-8 text-center text-slate-500">Chưa có danh mục.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.2fr)]">
            <form onSubmit={submitProduct} className="form-panel space-y-4 rounded-2xl bg-white p-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingProductId ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}
                </h2>
                <p className="mt-1 text-sm text-slate-600">Ảnh được lưu qua Cloudinary hoặc bộ nhớ local.</p>
              </div>
              <label className="block text-sm font-medium text-slate-700">
                Tên sản phẩm
                <input
                  required
                  maxLength="150"
                  value={productForm.ten_san_pham}
                  onChange={(event) => setProductForm({ ...productForm, ten_san_pham: event.target.value })}
                  className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  Danh mục
                  <select
                    required
                    value={productForm.category_id}
                    onChange={(event) => setProductForm({ ...productForm, category_id: event.target.value })}
                    className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"
                  >
                    <option value="">Chọn danh mục</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>{category.ten_danh_muc}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Giá bán (đ)
                  <input
                    required
                    type="number"
                    min="0"
                    step="1"
                    value={productForm.gia_ban}
                    onChange={(event) => setProductForm({ ...productForm, gia_ban: event.target.value })}
                    className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3"
                  />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  Đơn vị tính
                  <input
                    required
                    maxLength="20"
                    value={productForm.don_vi_tinh}
                    onChange={(event) => setProductForm({ ...productForm, don_vi_tinh: event.target.value })}
                    className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Trạng thái
                  <select
                    value={productForm.trang_thai}
                    onChange={(event) => setProductForm({ ...productForm, trang_thai: event.target.value })}
                    className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"
                  >
                    <option value="dang_ban">Đang bán</option>
                    <option value="ngung_ban">Ngừng bán</option>
                  </select>
                </label>
              </div>
              <label className="block text-sm font-medium text-slate-700">
                Mô tả
                <textarea
                  value={productForm.mo_ta}
                  onChange={(event) => setProductForm({ ...productForm, mo_ta: event.target.value })}
                  className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 p-3"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Ảnh sản phẩm (JPG, PNG, WEBP tối đa 5 MB)
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  onChange={(event) => setProductImage(event.target.files?.[0] ?? null)}
                  className="mt-1 block min-h-11 w-full rounded-lg border border-slate-300 p-2 text-sm"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={savingProduct || categories.length === 0}>
                  {savingProduct ? <LoadingSpinner label="Đang lưu sản phẩm" className="mr-2" /> : null}
                  {savingProduct ? 'Đang lưu...' : editingProductId ? 'Lưu sản phẩm' : 'Tạo sản phẩm'}
                </Button>
                {editingProductId && (
                  <Button variant="secondary" onClick={resetProductForm}>Hủy sửa</Button>
                )}
              </div>
            </form>

            <div className="dashboard-panel overflow-x-auto rounded-2xl bg-white">
              <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Sản phẩm</th>
                    <th className="px-4 py-3">Danh mục</th>
                    <th className="px-4 py-3">Giá</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-900">{product.ten_san_pham}</p>
                        {product.hinh_anh_dai_dien && (
                          <a
                            href={product.hinh_anh_dai_dien}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-block text-xs text-green-800 underline"
                          >
                            Xem ảnh
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-4 text-slate-600">{product.category?.ten_danh_muc ?? '—'}</td>
                      <td className="px-4 py-4 text-slate-700">
                        {Number(product.gia_ban).toLocaleString('vi-VN')} đ / {product.don_vi_tinh}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {product.trang_thai === 'dang_ban' ? 'Đang bán' : 'Ngừng bán'}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          <Button variant="secondary" onClick={() => editProduct(product)}>Sửa</Button>
                          <Button
                            variant="secondary"
                            onClick={() => deleteProduct(product)}
                            disabled={busyItem !== null}
                          >
                            {busyItem === `product-${product.id}` ? 'Đang xóa...' : 'Xóa'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {products.length === 0 && (
                    <tr><td colSpan="5" className="px-4 py-8 text-center text-slate-500">Chưa có sản phẩm.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </section>
  )
}

export default AdminProductsPage
