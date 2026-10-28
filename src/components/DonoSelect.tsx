import { useDependentes } from '../services/saude';

export const cardStyle = { background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' };
export const inputClass =
  'w-full px-4 py-3 rounded-xl text-sm outline-none border-[1.5px] border-[var(--border)] focus:border-[var(--primary)]';

/** Escolhe o dono do registro: o próprio usuário ("") ou um dependente (id). `vazio` muda o rótulo do "". */
export default function DonoSelect({ value, onChange, vazio = 'Para mim' }: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  vazio?: string;
}) {
  const dependentes = useDependentes();
  return (
    <select className={`${inputClass} appearance-none bg-[var(--card)]`} value={value} onChange={onChange} aria-label="De quem é">
      <option value="">{vazio}</option>
      {dependentes.map(d => (
        <option key={d.id} value={d.id}>{`${d.nome} (${d.parentesco})`}</option>
      ))}
    </select>
  );
}
