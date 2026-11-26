import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import productApi from '../../api/productApi.js'
import LoadingSpinner from '../../components/LoadingSpinner.jsx'

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
})

const categoryAccents = [
  'from-lime-100 to-green-50',
  'from-amber-100 to-lime-50',
  'from-green-100 to-emerald-50',
  'from-yellow-100 to-green-50',
]

function HomePage() {
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    async function loadHomeContent() {
      try {
        const [categoryResponse, productResponse] = await Promise.all([
          productApi.getCategories({ signal: controller.signal }),
          productApi.getProducts(
            { per_page: 6, sort: 'newest' },
            { signal: controller.signal },
          ),
        ])
        if (controller.signal.aborted) {
          return
        }

        setCategories(categoryResponse.data.data)
        setProducts(productResponse.data.data)
      } catch (error) {
        if (!controller.signal.aborted) {
          setErrorMessage(
            error.response?.data?.message ?? 'Không tải được dữ liệu trang chủ.',
          )
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    loadHomeContent()

    return () => controller.abort()
  }, [])

  return (
    <div className="space-y-14 sm:space-y-20">
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-green-950 via-green-800 to-lime-700 px-6 py-12 text-white shadow-xl sm:px-12 sm:py-16">
        <div
          aria-hidden="true"
          className="absolute -right-12 -top-20 h-72 w-72 rounded-full border-[36px] border-white/10"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-28 right-40 h-64 w-64 rounded-full bg-lime-300/10 blur-2xl"
        />
        <div className="relative max-w-2xl">
          <p className="inline-flex rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-lime-100">
            Tươi lành từ nông trại
          </p>
          <h1 className="mt-5 text-4xl font-black leading-tight sm:text-6xl">
            Nông sản sạch,
            <span className="block text-lime-200">an tâm mỗi ngày.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-green-50 sm:text-lg">
            Chọn thực phẩm theo mùa, biết rõ từng lô hàng và theo dõi hành trình
            canh tác minh bạch từ nông trại đến bàn ăn.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/products"
              className="inline-flex min-h-12 items-center rounded-xl bg-lime-300 px-6 py-3 font-bold text-green-950 transition hover:bg-lime-200"
            >
              Khám phá sản phẩm
            </Link>
            <Link
              to="/products?sort=newest"
              className="inline-flex min-h-12 items-center rounded-xl border border-white/40 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
            >
              Nông sản mới nhất
            </Link>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-green-700">
              Chọn theo mùa
            </p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
              Danh mục nổi bật
            </h2>
          </div>
          <Link className="text-sm font-semibold text-green-800 hover:underline" to="/products">
            Xem tất cả sản phẩm
          </Link>
        </div>
        {isLoading ? (
          <div className="flex min-h-28 items-center justify-center">
            <LoadingSpinner label="Đang tải danh mục" className="text-green-700" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((category, index) => (
              <Link
                key={category.id}
                to={`/products?category_id=${category.id}`}
                className={`group rounded-2xl bg-gradient-to-br ${categoryAccents[index % categoryAccents.length]} p-5 transition hover:-translate-y-1 hover:shadow-md`}
              >
                <span className="text-2xl" aria-hidden="true">✿</span>
                <h3 className="mt-3 font-bold text-green-950">
                  {category.ten_danh_muc}
                </h3>
                <p className="mt-1 text-sm text-green-900/70">
                  Khám phá sản phẩm
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-green-700">
              Vừa cập nhật
            </p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
              Sản phẩm mới nhất
            </h2>
          </div>
          <Link className="text-sm font-semibold text-green-800 hover:underline" to="/products">
            Đến cửa hàng
          </Link>
        </div>

        {errorMessage ? (
          <p className="rounded-xl bg-red-50 p-4 text-sm text-red-800" role="alert">
            {errorMessage}
          </p>
        ) : isLoading ? (
          <div className="flex min-h-48 items-center justify-center">
            <LoadingSpinner label="Đang tải sản phẩm mới" className="text-green-700" />
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
            Hiện chưa có sản phẩm nào đang mở bán.
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <article
                key={product.id}
                className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm"
              >
                {product.hinh_anh_dai_dien ? (
                  <img
                    src={product.hinh_anh_dai_dien}
                    alt={product.ten_san_pham}
                    className="h-48 w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-48 items-center justify-center bg-gradient-to-br from-green-100 to-lime-50 text-5xl" aria-hidden="true">
                    🌿
                  </div>
                )}
                <div className="p-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-green-700">
                    {product.category?.ten_danh_muc ?? 'Nông sản sạch'}
                  </p>
                  <h3 className="mt-2 text-lg font-bold text-slate-900">
                    {product.ten_san_pham}
                  </h3>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="font-bold text-green-800">
                      {currencyFormatter.format(Number(product.gia_ban_co_ban))}
                      <span className="ml-1 text-xs font-medium text-slate-500">
                        / {product.don_vi_tinh}
                      </span>
                    </p>
                    <Link
                      to={`/products/${product.slug}`}
                      className="text-sm font-semibold text-green-800 hover:underline"
                    >
                      Xem chi tiết
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default HomePage
