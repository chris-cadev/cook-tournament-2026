interface FooterProps {
  eventDate?: string
}

export default function Footer({ eventDate = '2026' }: FooterProps) {
  return (
    <footer className="text-center text-xs text-gray-400 py-8 border-t border-gray-100 mt-12">
      <p>El Campeonato de Sándwiches &amp; Celebración de Cumpleaños · {eventDate}</p>
    </footer>
  )
}
