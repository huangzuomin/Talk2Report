import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './style.css'
import './archival-elegance.css' // 🎨 新引入：档案雅致美学系统
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
