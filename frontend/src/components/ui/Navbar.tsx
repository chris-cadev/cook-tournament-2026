import { Link } from 'react-router-dom'

interface NavbarProps {
  title?: string
}

export default function Navbar({ title = 'El Campeonato de Sándwiches' }: NavbarProps) {
  return (
    <nav className="sticky top-0 z-50 bg-surface/95 backdrop-blur-sm border-b border-gray-200">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="font-headline text-xl font-black text-secondary">
          {title}
        </Link>
        <div className="flex items-center gap-4">
          <a href="/#rules" className="text-sm font-medium text-gray-600 hover:text-secondary transition-colors">Reglas</a>
          <Link to="/register" className="text-sm font-medium text-gray-600 hover:text-secondary transition-colors">Registro</Link>
          <Link to="/chat" className="text-sm font-medium text-gray-600 hover:text-secondary transition-colors">Chat</Link>
          <Link to="/results" className="text-sm font-medium text-gray-600 hover:text-secondary transition-colors">Resultados</Link>
        </div>
      </div>
    </nav>
  )
}
