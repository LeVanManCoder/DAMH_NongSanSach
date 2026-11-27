import { Leaf } from 'lucide-react'
import { Link } from 'react-router-dom'

const CURRENT_YEAR = new Date().getFullYear()

function Footer() {
  return (
    <footer className="site-footer storefront-footer">
      <div className="site-footer-inner">
        <section className="site-footer-about">
          <Link className="site-footer-brand" to="/">
            <span className="site-brand-mark" aria-hidden="true"><Leaf size={21} /></span>
            <span>Nông Lành</span>
          </Link>
          <p>
            Kết nối nông sản sạch với bữa cơm gia đình, minh bạch nguồn gốc từ
            nông trại đến bàn ăn.
          </p>
        </section>
        <nav className="site-footer-column" aria-label="Khám phá">
          <h2>Khám phá</h2>
          <Link to="/products">Sản phẩm</Link>
          <Link to="/about">Câu chuyện Nông Lành</Link>
          <Link to="/contact">Liên hệ</Link>
        </nav>
        <nav className="site-footer-column" aria-label="Hỗ trợ">
          <h2>Hỗ trợ</h2>
          <Link to="/orders">Đơn hàng</Link>
          <Link to="/profile">Sổ địa chỉ</Link>
          <Link to="/subscriptions">Gói định kỳ</Link>
        </nav>
      </div>
      <div className="site-footer-bottom">
        <span>© {CURRENT_YEAR} Nông Lành</span>
        <span>Ăn sạch · Sống lành</span>
      </div>
    </footer>
  )
}

export default Footer
