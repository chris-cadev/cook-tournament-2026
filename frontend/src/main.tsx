import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

if (import.meta.env.VITE_UMAMI_WEBSITE_ID && import.meta.env.VITE_UMAMI_SCRIPT_URL) {
  const script = document.createElement('script')
  script.defer = true
  script.dataset.websiteId = import.meta.env.VITE_UMAMI_WEBSITE_ID
  script.src = import.meta.env.VITE_UMAMI_SCRIPT_URL
  document.head.appendChild(script)
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
