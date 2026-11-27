import { ArrowDown, ArrowRight, Check, Sprout, Sun, Truck } from 'lucide-react'
import { Link } from 'react-router-dom'

const commitments = [
  {
    icon: Sprout,
    title: 'Tôn trọng mùa vụ',
    description: 'Ưu tiên sản phẩm theo mùa và cách canh tác phù hợp với từng loại cây trồng.',
  },
  {
    icon: Check,
    title: 'Minh bạch nguồn gốc',
    description: 'Mã QR giúp bạn xem thông tin lô và nhật ký canh tác được công khai.',
  },
  {
    icon: Truck,
    title: 'Tươi mới đến nhà',
    description: 'Thông tin lô hàng và hạn sử dụng rõ ràng trước khi bạn lựa chọn.',
  },
]

function AboutPage() {
  return (
    <article className="story-page">
      <section className="story-hero">
        <div className="story-hero-copy">
          <p className="section-kicker">Từ nông trại đến bàn ăn</p>
          <h1>Nuôi dưỡng<br /><em>những điều lành.</em></h1>
          <p>
            Nông Lành kết nối nông sản sạch với bữa cơm gia đình qua thông tin
            sản phẩm và hành trình canh tác minh bạch.
          </p>
          <Link className="story-primary-link" to="/products">
            Khám phá nông sản <ArrowRight size={17} />
          </Link>
        </div>
        <div className="story-hero-image" role="img" aria-label="Cánh đồng nông trại trong nắng sớm">
          <span className="story-image-label"><Sun size={16} /> Chọn điều lành mỗi ngày</span>
        </div>
        <a className="story-scroll-link" href="#our-values">
          Câu chuyện của chúng tôi <ArrowDown size={16} />
        </a>
      </section>

      <section className="story-intro" id="our-values">
        <div>
          <p className="section-kicker">01 — Điều chúng tôi tin</p>
          <h2>Trân trọng đất lành,<br />gìn giữ vị nguyên bản.</h2>
        </div>
        <p>
          Một lựa chọn an tâm bắt đầu từ thông tin rõ ràng. Mỗi sản phẩm được
          giới thiệu cùng dữ liệu có sẵn về lô hàng, ngày thu hoạch và nhật ký
          canh tác để bạn chủ động tìm hiểu trước khi đặt mua.
        </p>
      </section>

      <section className="story-values">
        {commitments.map(({ icon: Icon, title, description }, index) => (
          <article className="story-value-card" key={title}>
            <span className="story-value-number">0{index + 1}</span>
            <span className="story-value-icon" aria-hidden="true"><Icon size={22} strokeWidth={1.8} /></span>
            <h3>{title}</h3>
            <p>{description}</p>
          </article>
        ))}
      </section>

      <section className="story-cta">
        <div>
          <p className="section-kicker">Minh bạch trong từng lựa chọn</p>
          <h2>Tìm hiểu sản phẩm và<br />truy xuất nguồn gốc.</h2>
        </div>
        <Link className="story-primary-link" to="/products">
          Đi đến cửa hàng <ArrowRight size={17} />
        </Link>
      </section>
    </article>
  )
}

export default AboutPage
