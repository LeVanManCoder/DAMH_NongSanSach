import { useEffect, useState } from 'react'
import { SearchX, Sprout } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import EmptyState from '../../components/EmptyState.jsx'
import { ProductGridSkeleton } from '../../components/Skeletons.jsx'
import productApi from '../../api/productApi.js'

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
})

function ProductList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('search') ?? ''
  const categoryId = searchParams.get('category_id') ?? ''
  const sort = searchParams.get('sort') ?? 'name'
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [categoryError, setCategoryError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    async function loadCategories() {
      try {
        const response = await productApi.getCategories({ signal: controller.signal })
        if (!controller.signal.aborted) {
          setCategories(response.data.data)
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setCategoryError(error.response?.data?.message ?? 'Không tải được danh mục.')
        }
      }
    }

    loadCategories()

    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const timeoutId = window.setTimeout(async () => {
      setIsLoading(true)
      setErrorMessage('')

      const params = { per_page: 24, sort }
      if (search.trim()) {
        params.search = search.trim()
      }
      if (categoryId) {
        params.category_id = categoryId
      }

      try {
        const response = await productApi.getProducts(params, {
          signal: controller.signal,
        })
        setProducts(response.data.data)
      } catch (error) {
        if (!controller.signal.aborted) {
          setErrorMessage(
            error.response?.data?.message ??
              'Không tải được danh sách sản phẩm. Vui lòng thử lại.',
          )
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }, search ? 250 : 0)

    return () => {
      window.clearTimeout(timeoutId)
      controller.abort()
    }
  }, [categoryId, search, sort])

  function updateFilter(key, value) {
    const params = new URLSearchParams(searchParams)
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    setSearchParams(params, { replace: true })
  }

  return (
    <section>
      <div className="page-heading mb-8 py-1">
        <p className="section-kicker">
          Nông sản sạch theo mùa
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
          Sản phẩm từ nông trại
        </h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          Chọn nông sản tươi ngon, minh bạch lô hàng và thông tin canh tác.
        </p>
      </div>

      <div className="filter-panel mb-7 grid gap-3 rounded-2xl bg-white p-4 sm:grid-cols-[minmax(0,1fr)_15rem_12rem] sm:p-5">
        <label className="text-sm font-semibold text-slate-700">
          Tìm sản phẩm
          <input
            type="search"
            value={search}
            onChange={(event) => updateFilter('search', event.target.value)}
            placeholder="Nhập tên sản phẩm..."
            className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 px-3 font-normal outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
          />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Danh mục
          <select
            value={categoryId}
            onChange={(event) => updateFilter('category_id', event.target.value)}
            className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 font-normal outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
          >
            <option value="">Tất cả danh mục</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.ten_danh_muc}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Sắp xếp
          <select
            value={sort}
            onChange={(event) => updateFilter('sort', event.target.value)}
            className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 font-normal outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
          >
            <option value="name">Tên sản phẩm</option>
            <option value="newest">Mới nhất</option>
          </select>
        </label>
      </div>
      {categoryError && (
        <p className="mb-4 text-sm text-red-700" role="alert">{categoryError}</p>
      )}
      {errorMessage && (
        <p className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-800" role="alert">
          {errorMessage}
        </p>
      )}

      {isLoading ? (
        <ProductGridSkeleton />
      ) : products.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="Chưa tìm thấy sản phẩm phù hợp"
          description="Hãy thử đổi từ khóa hoặc chọn một danh mục khác."
          actionLabel="Xóa bộ lọc"
          onAction={() => setSearchParams({})}
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => {
            const availableQuantity = product.batches.reduce(
              (total, batch) => total + Number(batch.so_luong_kha_dung),
              0,
            )

            return (
              <article
                key={product.id}
                className="product-card flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm"
              >
                {product.hinh_anh_dai_dien ? (
                  <img
                    src={product.hinh_anh_dai_dien}
                    alt={product.ten_san_pham}
                    className="h-48 w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="flex h-48 items-center justify-center bg-gradient-to-br from-green-100 to-lime-50 text-green-800"
                  >
                    <Sprout size={48} strokeWidth={1.4} />
                  </div>
                )}
                <div className="flex flex-1 flex-col p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
                    {product.category?.ten_danh_muc ?? 'Nông sản sạch'}
                  </p>
                  <h2 className="mt-2 text-lg font-bold text-slate-900">
                    {product.ten_san_pham}
                  </h2>
                  <p className="mt-2 line-clamp-2 flex-1 text-sm text-slate-600">
                    {product.mo_ta}
                  </p>
                  <div className="mt-5 flex items-end justify-between gap-3">
                    <div>
                      <p className="font-bold text-green-800">
                        {currencyFormatter.format(Number(product.gia_ban_co_ban))}
                        <span className="ml-1 text-xs font-medium text-slate-500">
                          / {product.don_vi_tinh}
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Còn {availableQuantity} {product.don_vi_tinh}
                      </p>
                    </div>
                    <Link
                      to={`/products/${product.slug}`}
                      className="inline-flex min-h-11 items-center rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2"
                    >
                      Xem chi tiết
                    </Link>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default ProductList
