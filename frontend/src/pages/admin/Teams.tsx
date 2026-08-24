import TeamTable from '../../components/admin/TeamTable'

export default function Teams() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="font-headline text-3xl font-black text-secondary mb-2">Equipos</h1>
        <p className="text-gray-500">Gestiona los equipos registrados.</p>
      </div>
      <TeamTable />
    </div>
  )
}
