import Button from '../../components/Button.jsx'

function ProductDetail() {
  return (
    <section className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-sm sm:p-10">
      <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
        Nông sản theo mùa
      </p>
      <h1 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">
        Chi tiết sản phẩm
      </h1>
      <p className="mt-3 text-slate-600">
        Thông tin sản phẩm sẽ được kết nối với API trong bước phát triển tiếp
        theo.
      </p>
      <Button className="mt-6">Thêm vào giỏ hàng</Button>
    </section>
  )
}

export default ProductDetail
