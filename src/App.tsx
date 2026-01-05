import { Link, Route, Routes, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import PhotoProduct from './pages/PhotoProduct'
import PhotoReceipt from './pages/PhotoReceipt'
import ReceiptView from './pages/ReceiptView'
import ScanQR from './pages/ScanQR'

function Header() {
  const location = useLocation()

  return (
    <header className="topbar">
      <Link className="brand" to="/">
        <span role="img" aria-label="scanner">
          🔍
        </span>
        <span>4buy Scanner</span>
      </Link>
      <span className="pill">
        {location.pathname === '/' ? 'Ready' : location.pathname.replace('/', '')}
      </span>
    </header>
  )
}

function App() {
  return (
    <div className="shell">
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/scan-qr" element={<ScanQR />} />
        <Route path="/photo-receipt" element={<PhotoReceipt />} />
        <Route path="/photo-product" element={<PhotoProduct />} />
        <Route path="/receipt" element={<ReceiptView />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </div>
  )
}

export default App
