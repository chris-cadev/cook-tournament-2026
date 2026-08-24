import { useEffect } from 'react'

const WEBSITE_ID = import.meta.env.VITE_UMAMI_WEBSITE_ID
const SCRIPT_URL = import.meta.env.VITE_UMAMI_SCRIPT_URL || 'https://umami.is/script.js'

export default function Umami() {
  useEffect(() => {
    if (!WEBSITE_ID) return
    if (document.querySelector(`script[data-website-id="${WEBSITE_ID}"]`)) return
    const script = document.createElement('script')
    script.defer = true
    script.dataset.websiteId = WEBSITE_ID
    script.src = SCRIPT_URL
    document.head.appendChild(script)
  }, [])

  return null
}
