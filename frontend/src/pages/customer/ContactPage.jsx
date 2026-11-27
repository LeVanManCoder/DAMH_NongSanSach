import { ArrowRight, ClipboardList, MapPin, MessageCircle, PackageCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import useAuth from '../../contexts/useAuth.js'

function ContactPage() {
  const { user } = useAuth()

  return (
    <article className="contact-page">
      <header className="contact-hero">
        <p className="section-kicker">Chúng tôi sẵn sàng hỗ trợ</p>
        <h1>Mình cùng tìm<br /><em>lời giải lành.</em></h1>
        <p>
          Chọn đúng mục hỗ trợ để xem thông tin đơn hàng, cập nhật địa chỉ giao
          nhận hoặc tìm hiểu nguồn gốc nông sản.
        </p>
      </header>

      <section className="contact-options" aria-label="Các cách nhận hỗ trợ">
        <article className="contact-option-card">
          <span aria-hidden="true"><PackageCheck size={23} /></span>
          <p className="section-kicker">Đơn hàng</p>
          <h2>Theo dõi hành trình đặt mua</h2>
          <p>Xem trạng thái và thông tin giao hàng trong lịch sử đơn hàng của bạn.</p>
          <Link to={user?.role === 'customer' ? '/orders' : '/login'}>
            {user?.role === 'customer' ? 'Mở đơn hàng' : 'Đăng nhập để xem đơn'}
            <ArrowRight size={16} />
          </Link>
        </article>
        <article className="contact-option-card">
          <span aria-hidden="true"><MessageCircle size={23} /></span>
          <p className="section-kicker">Chất lượng sản phẩm</p>
          <h2>Gửi phản hồi sau khi nhận hàng</h2>
          <p>
            Nếu đơn đã giao trong 24 giờ, bạn có thể gửi khiếu nại kèm ảnh minh
            chứng từ trang đơn hàng.
          </p>
          <Link to={user?.role === 'customer' ? '/orders' : '/login'}>
            Xem hướng dẫn khiếu nại <ArrowRight size={16} />
          </Link>
        </article>
        <article className="contact-option-card">
          <span aria-hidden="true"><MapPin size={23} /></span>
          <p className="section-kicker">Giao nhận</p>
          <h2>Kiểm tra địa chỉ giao hàng</h2>
          <p>Quản lý địa chỉ đã lưu để thuận tiện cho những lần đặt hàng tiếp theo.</p>
          <Link to={user?.role === 'customer' ? '/profile' : '/login'}>
            {user?.role === 'customer' ? 'Mở sổ địa chỉ' : 'Đăng nhập để quản lý'}
            <ArrowRight size={16} />
          </Link>
        </article>
      </section>

      <section className="contact-note">
        <ClipboardList size={20} aria-hidden="true" />
        <p>
          Trang này cung cấp các kênh hỗ trợ trong ứng dụng. Thông tin liên hệ
          trực tiếp sẽ được cập nhật khi có dữ liệu chính thức.
        </p>
      </section>
    </article>
  )
}

export default ContactPage
