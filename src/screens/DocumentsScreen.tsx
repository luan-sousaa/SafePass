import { useState } from 'react';
import type { Screen } from '../App';
import UiIcon from '../components/UiIcon';

const allDocs = [
  { type: 'Receita', name: 'Omeprazol 20mg', date: '18 set 2026', doctor: 'Dr. Carlos Lima' },
  { type: 'Exame', name: 'Hemograma Completo', date: '12 set 2026', doctor: 'Lab. Einstein' },
  { type: 'Consulta', name: 'Cardiologia – Dr. Farias', date: '05 set 2026', doctor: 'Dr. Roberto Farias' },
  { type: 'Vacina', name: 'Influenza 2026', date: '02 set 2026', doctor: 'UBS Consolação' },
  { type: 'Receita', name: 'Vitamina D 2000UI', date: '28 ago 2026', doctor: 'Dra. Fernanda Alves' },
  { type: 'Exame', name: 'Raio-X Tórax', date: '20 ago 2026', doctor: 'Lab. Fleury' },
  { type: 'Consulta', name: 'Dermatologia', date: '15 ago 2026', doctor: 'Dra. Beatriz Costa' },
  { type: 'Vacina', name: 'Hepatite B – 2ª dose', date: '10 ago 2026', doctor: 'UBS Pinheiros' },
];

const filters = ['Todos', 'Receitas', 'Exames', 'Consultas', 'Vacinas'];
const filterMap: Record<string, string> = { Todos: '', Receitas: 'Receita', Exames: 'Exame', Consultas: 'Consulta', Vacinas: 'Vacina' };

export default function DocumentsScreen({ navigate }: { navigate: (s: Screen) => void }) {
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [search, setSearch] = useState('');

  const filtered = allDocs.filter(d => {
    const matchType = !filterMap[activeFilter] || d.type === filterMap[activeFilter];
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase()) || d.doctor.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Search */}
      <div className="relative">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--muted-foreground)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        <input
          type="text"
          placeholder="Buscar documentos..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 rounded-xl text-sm outline-none"
          style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
          onFocus={e => { e.target.style.borderColor = 'var(--primary)'; }}
          onBlur={e => { e.target.style.borderColor = 'var(--border)'; }}
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className="shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: activeFilter === f ? 'var(--nav-active)' : 'var(--card)',
              color: activeFilter === f ? 'var(--brand-dark)' : 'var(--muted-foreground)',
              border: '1px solid ' + (activeFilter === f ? 'var(--brand)' : 'var(--border)'),
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Results count */}
      <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
        {filtered.length} documento{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
      </p>

      {/* Document list */}
      <div className="rounded-lg overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
        {filtered.map((doc, i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-4 cursor-pointer transition-colors border-b last:border-b-0 hover:bg-[var(--muted)]"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="w-9 h-9 rounded-md flex items-center justify-center shrink-0" style={{ background: 'var(--muted)', color: 'var(--brand)' }}>
              <UiIcon name="document" className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{doc.name}</p>
                <span className="text-xs font-medium shrink-0" style={{ color: 'var(--muted-foreground)' }}>
                  {doc.type}
                </span>
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>{doc.doctor} · {doc.date}</p>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-16" style={{ color: 'var(--muted-foreground)' }}>
            <UiIcon name="search" className="w-8 h-8 mx-auto mb-3" />
            <p className="text-sm font-medium">Nenhum documento encontrado</p>
            <p className="text-xs mt-1">Tente outros termos ou filtros</p>
          </div>
        )}
      </div>

    </div>
  );
}
