import { useState, useEffect } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { useToastStore } from '../../stores/toastStore'
import AdminNavbar from '../../components/admin/AdminNavbar'

interface Config {
  event_date: string
  event_title: string
  event_description: string
  rules: string
  scoring_categories: string[]
  landing_page_content: string
}

function AccordionSection({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left">
        <span className="font-headline font-bold text-secondary text-sm">{title}</span>
        <span className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open && <div className="p-4 space-y-4">{children}</div>}
    </div>
  )
}

export default function EventSettings() {
  const { token } = useAuthStore()
  const addToast = useToastStore((s) => s.add)
  const [config, setConfig] = useState<Config>({
    event_date: '', event_title: '', event_description: '',
    rules: '', scoring_categories: [], landing_page_content: '',
  })
  const [newCategory, setNewCategory] = useState('')
  const [judgePassword, setJudgePassword] = useState('')
  const [teamPassword, setTeamPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((data) => {
        setConfig({
          event_date: data.event_date || '',
          event_title: data.event_title || '',
          event_description: data.event_description || '',
          rules: data.rules || '',
          scoring_categories: data.scoring_categories || [],
          landing_page_content: data.landing_page_content || '',
        })
      })
      .finally(() => setLoading(false))
  }, [])

  const set = (key: string, val: string) => setConfig((c) => ({ ...c, [key]: val }))

  const addCategory = () => {
    if (newCategory.trim() && !config.scoring_categories.includes(newCategory.trim())) {
      setConfig((c) => ({ ...c, scoring_categories: [...c.scoring_categories, newCategory.trim()] }))
      setNewCategory('')
    }
  }

  const removeCategory = (i: number) => {
    setConfig((c) => ({ ...c, scoring_categories: c.scoring_categories.filter((_, j) => j !== i) }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const body: any = { ...config }
      if (judgePassword) body.judge_password = judgePassword
      if (teamPassword) body.team_password = teamPassword
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      if (!res.ok) { addToast('Error saving settings', 'error'); return }
      addToast('Settings saved!', 'success')
      setJudgePassword('')
      setTeamPassword('')
    } catch {
      addToast('Network error', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" /></div>
  }

  return (
    <div className="min-h-screen bg-surface">
      <AdminNavbar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="font-headline text-3xl font-black text-secondary mb-6">Event Settings</h1>
        <div className="space-y-4">
          <AccordionSection title="General" defaultOpen>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Event Title</label>
              <input value={config.event_title} onChange={(e) => set('event_title', e.target.value)} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Event Date</label>
              <input type="datetime-local" value={config.event_date?.slice(0, 16) || ''} onChange={(e) => set('event_date', e.target.value)} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm" />
            </div>
          </AccordionSection>

          <AccordionSection title="Content">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Event Description (Markdown)</label>
              <textarea value={config.event_description} onChange={(e) => set('event_description', e.target.value)} rows={4} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm resize-none font-mono" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rules (Markdown)</label>
              <textarea value={config.rules} onChange={(e) => set('rules', e.target.value)} rows={4} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm resize-none font-mono" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Landing Page Content (Markdown)</label>
              <textarea value={config.landing_page_content} onChange={(e) => set('landing_page_content', e.target.value)} rows={4} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm resize-none font-mono" />
            </div>
          </AccordionSection>

          <AccordionSection title="Scoring">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Scoring Categories</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {config.scoring_categories.map((cat, i) => (
                  <span key={i} className="bg-primary/10 text-primary-dark text-sm font-medium px-3 py-1 rounded-full flex items-center gap-1">
                    {cat}
                    <button onClick={() => removeCategory(i)} className="ml-1 text-primary-dark/60 hover:text-red-600">✕</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="New category" className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCategory())} />
                <button onClick={addCategory} className="px-4 py-2 bg-secondary/10 text-secondary font-bold text-sm rounded-xl hover:bg-secondary/20">Add</button>
              </div>
            </div>
          </AccordionSection>

          <AccordionSection title="Security">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Judge Password</label>
                <input type="password" value={judgePassword} onChange={(e) => setJudgePassword(e.target.value)} placeholder="Leave blank to keep" className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Team Password</label>
                <input type="password" value={teamPassword} onChange={(e) => setTeamPassword(e.target.value)} placeholder="Leave blank to keep" className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm" />
              </div>
            </div>
          </AccordionSection>

          <button onClick={handleSave} disabled={saving} className="bg-primary text-white font-bold px-6 py-2.5 rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}
