import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

const umamiId = import.meta.env.VITE_UMAMI_WEBSITE_ID
const umamiUrl = import.meta.env.VITE_UMAMI_SCRIPT_URL
if (umamiId && umamiUrl) {
  const script = document.createElement('script')
  script.defer = true
  script.dataset.websiteId = umamiId
  script.src = umamiUrl
  document.head.appendChild(script)
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
