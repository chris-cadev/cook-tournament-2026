import { Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

export default function Navbar() {
  const { user, logout } = useAuthStore()

  return (
    <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="font-headline text-xl font-black text-secondary hover:text-primary-dark transition-colors">
          El Campeonato
        </Link>
        <div className="flex items-center gap-4 text-sm font-medium">
          <Link to="/" className="text-gray-600 hover:text-secondary transition-colors">Inicio</Link>
          <Link to="/results" className="text-gray-600 hover:text-secondary transition-colors">Resultados</Link>
          <Link to="/chat" className="text-gray-600 hover:text-secondary transition-colors">Chat</Link>
          <Link to="/register" className="text-gray-600 hover:text-secondary transition-colors">Registro</Link>
          <Link to="/invite" className="text-gray-600 hover:text-secondary transition-colors">Invitar</Link>
          {user?.role === 'admin' && (
            <Link to="/admin" className="text-primary-dark hover:text-primary transition-colors font-bold">Admin</Link>
          )}
          {user ? (
            <button onClick={logout} className="text-gray-400 hover:text-error transition-colors text-xs">
              Salir
            </button>
          ) : (
            <Link to="/login" className="bg-primary text-white px-3 py-1.5 rounded-xl hover:bg-primary-dark transition-colors text-xs font-bold">
              Entrar
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
