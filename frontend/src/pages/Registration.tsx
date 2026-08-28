import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

export default function Registration() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [form, setForm] = useState({
    name: '', sandwich_name: '', captain_name: '', captain_email: '', captain_phone: '', password: '', password_confirm: '',
    member2: '', member2_email: '', member2_phone: '', member3: '', member3_email: '', member3_phone: '',
    needs_outlet: false, needs_airfryer: false, own_grill: false,
    open_to_join: 'true',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)

  const update = (field: string, value: string) => {
    setForm((f) => ({ ...f, [field]: value }))
    if (errors[field]) setErrors((e) => { const n = { ...e }; delete n[field]; return n })
  }

  const blur = (field: string) => {
    setTouched((t) => ({ ...t, [field]: true }))
    // Validate on blur
    const e: Record<string, string> = {}
    if (field === 'name') {
      if (!form.name.trim()) e.name = 'Escribe el nombre de tu equipo'
      else if (form.name.trim().length < 2) e.name = 'Mínimo 2 caracteres'
    }
    if (field === 'captain_name' && !form.captain_name.trim()) e.captain_name = '¿Cómo te llamas?'
    if (field === 'captain_phone' && !form.captain_phone.trim()) e.captain_phone = 'Necesitamos tu teléfono'
    if (field === 'captain_email') {
      if (!form.captain_email.trim()) e.captain_email = 'Necesitamos tu email'
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.captain_email)) e.captain_email = 'Email inválido'
    }
    if (field === 'password') {
      if (!form.password) e.password = 'Elige una contraseña'
      else if (form.password.length < 4) e.password = 'Mínimo 4 caracteres'
    }
    if (field === 'password_confirm') {
      if (form.password !== form.password_confirm) e.password_confirm = 'Las contraseñas no coinciden'
    }
    if (Object.keys(e).length > 0) setErrors((prev) => ({ ...prev, ...e }))
  }

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Escribe el nombre de tu equipo'
    else if (form.name.trim().length < 2) e.name = 'Mínimo 2 caracteres'
    if (!form.captain_name.trim()) e.captain_name = '¿Cómo te llamas?'
    if (!form.captain_phone.trim()) e.captain_phone = 'Necesitamos tu teléfono'
    if (!form.captain_email.trim()) e.captain_email = 'Necesitamos tu email'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.captain_email)) e.captain_email = 'Email inválido'
    if (!form.password) e.password = 'Elige una contraseña'
    else if (form.password.length < 4) e.password = 'Mínimo 4 caracteres'
    if (form.password !== form.password_confirm) e.password_confirm = 'Las contraseñas no coinciden'
    setErrors(e)
    setTouched({ name: true, captain_name: true, captain_phone: true, captain_email: true, password: true, password_confirm: true })
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const members = [
        { name: form.captain_name.trim(), email: form.captain_email.trim(), phone: form.captain_phone.trim() },
        form.member2.trim() ? { name: form.member2.trim(), email: form.member2_email.trim() || null, phone: form.member2_phone.trim() || null } : null,
        form.member3.trim() ? { name: form.member3.trim(), email: form.member3_email.trim() || null, phone: form.member3_phone.trim() || null } : null,
      ].filter(Boolean)
      const res = await fetch('/api/teams/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          sandwich_name: form.sandwich_name.trim() || null,
          captain_email: form.captain_email.trim(),
          password: form.password,
          members,
          equipment_needs: { needs_outlet: form.needs_outlet, needs_airfryer: form.needs_airfryer, own_grill: form.own_grill },
          open_to_join: form.open_to_join === 'true',
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrors({ submit: data.error || 'Error al registrar' })
        return
      }
      login(data.team)
      navigate('/team/dashboard')
    } catch {
      setErrors({ submit: 'Error de red' })
    } finally {
      setLoading(false)
    }
  }

  const fieldClass = (field: string) => {
    const hasError = touched[field] && errors[field]
    const isValid = touched[field] && !errors[field] && form[field as keyof typeof form]
    return `w-full border rounded-xl px-3 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 ${
      hasError ? 'border-red-400 bg-red-50 focus:ring-red-200'
      : isValid ? 'border-green-300 bg-green-50/50'
      : 'border-gray-200 hover:border-gray-300'
    }`
  }

  const errorMsg = (field: string) =>
    touched[field] && errors[field] ? <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><span className="inline-block w-1 h-1 bg-red-500 rounded-full" />{errors[field]}</p> : null

  return (
    <div className="min-h-screen bg-surface py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="font-headline text-3xl font-black text-secondary text-center mb-1">Registro de Equipo</h1>
        <p className="text-gray-500 text-center mb-8 text-sm">Registras tu equipo en 2 minutos</p>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Formulario */}
          <form onSubmit={handleSubmit} className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
            {errors.submit && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-xl flex items-center gap-2"><span className="text-lg">⚠️</span>{errors.submit}</div>}

            {/* 1. Tu equipo */}
            <fieldset>
              <legend className="text-sm font-bold text-secondary flex items-center gap-2 mb-3">
                <span className="bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                Tu equipo
              </legend>
              <div className="space-y-3 pl-8">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del equipo *</label>
                  <input type="text" value={form.name} onChange={(e) => update('name', e.target.value)} onBlur={() => blur('name')} maxLength={50} autoFocus
                    className={fieldClass('name')} placeholder="Ej: Los Panaderos" />
                  {errorMsg('name')}
                  {!errors.name && <p className="text-xs text-gray-400 mt-0.5">{form.name.length}/50</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del sándwich <span className="text-gray-400">(puedes decidir después)</span></label>
                  <input type="text" value={form.sandwich_name} onChange={(e) => update('sandwich_name', e.target.value)} maxLength={50}
                    className={fieldClass('sandwich_name')} placeholder="Lo inventan el día del evento" />
                </div>
              </div>
            </fieldset>

            {/* 2. Tú (capitán) */}
            <fieldset className="border-t border-gray-100 pt-5">
              <legend className="text-sm font-bold text-secondary flex items-center gap-2 mb-3">
                <span className="bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                Tú (capitán)
              </legend>
              <div className="space-y-3 pl-8">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tu nombre completo *</label>
                  <input type="text" value={form.captain_name} onChange={(e) => update('captain_name', e.target.value)} onBlur={() => blur('captain_name')} maxLength={50}
                    className={fieldClass('captain_name')} placeholder="Ej: María López" />
                  {errorMsg('captain_name')}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tu email *</label>
                  <input type="email" value={form.captain_email} onChange={(e) => update('captain_email', e.target.value)} onBlur={() => blur('captain_email')}
                    className={fieldClass('captain_email')} placeholder="maria@ejemplo.com" />
                  {errorMsg('captain_email')}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tu teléfono *</label>
                  <input type="tel" value={form.captain_phone} onChange={(e) => update('captain_phone', e.target.value)} onBlur={() => blur('captain_phone')}
                    className={fieldClass('captain_phone')} placeholder="Tu teléfono *" />
                  {errorMsg('captain_phone')}
                </div>
              </div>
            </fieldset>

            {/* 3. Contraseña */}
            <fieldset className="border-t border-gray-100 pt-5">
              <legend className="text-sm font-bold text-secondary flex items-center gap-2 mb-3">
                <span className="bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                Contraseña del equipo
              </legend>
              <div className="space-y-3 pl-8">
                <div>
                  <input type="password" value={form.password} onChange={(e) => update('password', e.target.value)} onBlur={() => blur('password')} minLength={4}
                    className={fieldClass('password')} placeholder="Mínimo 4 caracteres *" />
                  {errorMsg('password')}
                </div>
                <div>
                  <input type="password" value={form.password_confirm} onChange={(e) => update('password_confirm', e.target.value)} onBlur={() => blur('password_confirm')}
                    className={fieldClass('password_confirm')} placeholder="Repite la contraseña *" />
                  {errorMsg('password_confirm')}
                </div>
                <p className="text-xs text-blue-600 flex items-center gap-1">💡 Compártela con los miembros para que accedan al chat.</p>
              </div>
            </fieldset>

            {/* 4. Miembros */}
            <fieldset className="border-t border-gray-100 pt-5">
              <legend className="text-sm font-bold text-secondary flex items-center gap-2 mb-3">
                <span className="bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">4</span>
                Integrantes <span className="text-gray-400 font-normal">(opcional)</span>
              </legend>
              <div className="space-y-2 pl-8">
                <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-xs text-green-700">
                  ✓ {form.captain_name || 'Tú'} — capitán
                </div>
                <input type="text" placeholder="Miembro 2 — nombre" value={form.member2} onChange={(e) => update('member2', e.target.value)} maxLength={50}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                {form.member2 && (
                  <input type="email" placeholder="Miembro 2 — email (para poder entrar)" value={form.member2_email} onChange={(e) => update('member2_email', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                )}
                {form.member2 && (
                  <input type="tel" placeholder="Miembro 2 — teléfono (opcional)" value={form.member2_phone} onChange={(e) => update('member2_phone', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                )}
                <input type="text" placeholder="Miembro 3 — nombre" value={form.member3} onChange={(e) => update('member3', e.target.value)} maxLength={50}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                {form.member3 && (
                  <input type="email" placeholder="Miembro 3 — email (para poder entrar)" value={form.member3_email} onChange={(e) => update('member3_email', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                )}
                {form.member3 && (
                  <input type="tel" placeholder="Miembro 3 — teléfono (opcional)" value={form.member3_phone} onChange={(e) => update('member3_phone', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                )}
              </div>
            </fieldset>

            {/* 5. Privacidad */}
            <fieldset className="border-t border-gray-100 pt-5">
              <legend className="text-sm font-bold text-secondary flex items-center gap-2 mb-3">
                <span className="bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">5</span>
                ¿Tu equipo está abierto?
              </legend>
              <div className="flex gap-3 pl-8">
                <button type="button" onClick={() => update('open_to_join', 'true')}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium border-2 transition-all ${
                    form.open_to_join === 'true' ? 'border-primary bg-primary/10 text-primary-dark shadow-sm' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}>
                  🤝 Abierto
                </button>
                <button type="button" onClick={() => update('open_to_join', 'false')}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium border-2 transition-all ${
                    form.open_to_join === 'false' ? 'border-secondary bg-secondary/10 text-secondary-dark shadow-sm' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}>
                  🔒 Privado
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2 pl-8">
                {form.open_to_join === 'true'
                  ? 'Aparecerá en la lista para que otros se unan.'
                  : 'No será visible para personas buscando equipo.'}
              </p>
            </fieldset>

            {/* 6. Extra */}
            <fieldset className="border-t border-gray-100 pt-5">
              <legend className="text-sm font-bold text-secondary flex items-center gap-2 mb-3">
                <span className="bg-gray-300 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">6</span>
                Necesidades <span className="text-gray-400 font-normal">(opcional)</span>
              </legend>
              <div className="pl-8 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" checked={form.needs_outlet} onChange={(e) => update('needs_outlet', String(e.target.checked))}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/50 accent-primary" />
                  <span className="text-sm text-gray-700 group-hover:text-secondary transition-colors">Necesito enchufe eléctrico</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" checked={form.needs_airfryer} onChange={(e) => update('needs_airfryer', String(e.target.checked))}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/50 accent-primary" />
                  <span className="text-sm text-gray-700 group-hover:text-secondary transition-colors">Necesito freidora de aire</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" checked={form.own_grill} onChange={(e) => update('own_grill', String(e.target.checked))}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/50 accent-primary" />
                  <span className="text-sm text-gray-700 group-hover:text-secondary transition-colors">Traigo mi propia plancha</span>
                </label>
              </div>
            </fieldset>

            <button type="submit" disabled={loading}
              className="w-full bg-primary hover:bg-primary-dark text-white font-headline font-bold py-3.5 rounded-2xl transition-colors disabled:opacity-50 text-base">
              {loading ? 'Registrando...' : 'Registrar Equipo'}
            </button>
          </form>

          {/* Sidebar — Qué lleva cada quién */}
          <aside className="lg:w-72 shrink-0">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 lg:sticky lg:top-20">
              <h3 className="font-headline font-bold text-secondary text-sm mb-3 flex items-center gap-2">
                <span className="text-lg">📋</span> ¿Qué lleva cada quién?
              </h3>
              <div className="space-y-3 text-xs">
                <div className="bg-tertiary/5 rounded-xl p-3">
                  <p className="font-bold text-tertiary mb-1.5">El organizador provee</p>
                  <ul className="space-y-1 text-gray-600">
                    <li className="flex items-start gap-1.5"><span className="text-tertiary mt-0.5">✓</span>Mesa (1 por equipo)</li>
                    <li className="flex items-start gap-1.5"><span className="text-tertiary mt-0.5">✓</span>Enchufes</li>
                    <li className="flex items-start gap-1.5"><span className="text-tertiary mt-0.5">✓</span>Nevera compartida</li>
                    <li className="flex items-start gap-1.5"><span className="text-tertiary mt-0.5">✓</span>Microondas</li>
                    <li className="flex items-start gap-1.5"><span className="text-tertiary mt-0.5">✓</span>Freidora de aire</li>
                    <li className="flex items-start gap-1.5"><span className="text-tertiary mt-0.5">✓</span>Botes de basura</li>
                    <li className="flex items-start gap-1.5"><span className="text-tertiary mt-0.5">✓</span>Platos para emplatado</li>
                  </ul>
                </div>
                <div className="bg-error/5 rounded-xl p-3">
                  <p className="font-bold text-error mb-1.5">Cada equipo debe traer</p>
                  <ul className="space-y-1 text-gray-600">
                    <li className="flex items-start gap-1.5"><span className="text-error mt-0.5">!</span><strong>TODOS los ingredientes</strong></li>
                    <li className="flex items-start gap-1.5"><span className="text-error mt-0.5">!</span>Proteínas listas</li>
                    <li className="flex items-start gap-1.5"><span className="text-error mt-0.5">!</span>Cuchillos y utensilios</li>
                    <li className="flex items-start gap-1.5"><span className="text-error mt-0.5">!</span>Cocina portátil</li>
                    <li className="flex items-start gap-1.5"><span className="text-error mt-0.5">!</span>Ollas y sartenes</li>
                    <li className="flex items-start gap-1.5"><span className="text-error mt-0.5">!</span>Fuente propia</li>
                  </ul>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <div className="text-center mt-6 text-sm text-gray-500">
          <Link to="/" className="hover:text-primary">← Volver al inicio</Link>
        </div>
      </div>
    </div>
  )
}
