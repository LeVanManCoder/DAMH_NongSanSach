import { ChevronRight, Home } from 'lucide-react'
import { Link } from 'react-router-dom'

function Breadcrumbs({ items = [] }) {
  return (
    <nav className="breadcrumbs" aria-label="Đường dẫn">
      <ol>
        <li>
          <Link to="/" aria-label="Trang chủ">
            <Home size={16} aria-hidden="true" />
            <span>Trang chủ</span>
          </Link>
        </li>
        {items.map((item, index) => {
          const current = index === items.length - 1
          return (
            <li key={`${item.label}-${index}`}>
              <ChevronRight className="breadcrumb-separator" size={15} aria-hidden="true" />
              {current || !item.to ? (
                <span aria-current={current ? 'page' : undefined}>{item.label}</span>
              ) : (
                <Link to={item.to}>{item.label}</Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export default Breadcrumbs
