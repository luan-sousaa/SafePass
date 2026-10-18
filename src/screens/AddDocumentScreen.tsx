import { useEffect, useRef, useState } from 'react';
import type { Screen } from '../types';
import Icon, { type IconName } from '../components/Icon';
import { extractPrescription, savePrescription, type Medicamento } from '../services/prescriptions';

type Step = 'choose' | 'analyzing' | 'review' | 'error' | 'manual';

const emptyItem: Medicamento = { medicamento: '', dose: '', posologia: '', periodo: '', precisa_revisar: false };

const itemFields: { key: 'medicamento' | 'dose' | 'posologia' | 'periodo'; label: string; placeholder: string }[] = [
  { key: 'medicamento', label: 'Medicamento', placeholder: 'Ex.: Amoxicilina' },
  { key: 'dose', label: 'Dosagem', placeholder: 'Ex.: 500 mg' },
  { key: 'posologia', label: 'Posologia', placeholder: 'Ex.: 1 cápsula a cada 8 horas' },
  { key: 'periodo', label: 'Período', placeholder: 'Ex.: 7 dias' },
];

const cardStyle = { background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' };
const inputClass =
  'w-full px-4 py-3 rounded-xl text-sm outline-none border-[1.5px] border-[var(--border)] focus:border-[var(--primary)]';
const btnPrimary = 'py-3 rounded-xl text-sm font-semibold text-white bg-[var(--primary)] transition-opacity hover:opacity-90';
const btnSecondary = 'py-3 rounded-xl text-sm font-semibold bg-[var(--muted)] text-[var(--foreground)] border border-[var(--border)]';

export default function AddDocumentScreen({ navigate }: { navigate: (s: Screen) => void }) {
  const [step, setStep] = useState<Step>('choose');
  const [error, setError] = useState('');
  const [needsReview, setNeedsReview] = useState(false);
  const [rawText, setRawText] = useState<string | null>(null);
  const [items, setItems] = useState<Medicamento[]>([emptyItem]);
  const [date, setDate] = useState('');
  const [medico, setMedico] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const fail = (message: string) => { setError(message); setStep('error'); };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;

    setPreview(URL.createObjectURL(file));
    setStep('analyzing');

    try {
      const result = await extractPrescription(file);

      if (result.source === 'tesseract_fallback') {
        setRawText(result.observacoes);
        setItems([emptyItem]);
        setStep('manual');
      } else if (result.medicamentos.length === 0) {
        fail('A foto não ficou legível ou não parece uma receita médica. Tente outra foto, mais nítida e bem iluminada.');
      } else {
        setItems(result.medicamentos);
        setMedico(result.medico ?? '');
        setDate(result.data_receita ?? '');
        setNeedsReview(result.needs_manual_review);
        setStep('review');
      }
    } catch (err) {
      fail(err instanceof Error ? err.message : 'Não foi possível analisar o documento.');
    }
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFile(e.target.files?.[0]);
    e.target.value = ''; // permite escolher o mesmo arquivo de novo depois de "Tentar novamente"
  };

  const restart = () => {
    setPreview(null);
    setRawText(null);
    setNeedsReview(false);
    setItems([emptyItem]);
    setMedico('');
    setDate('');
    setStep('choose');
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    try {
      await savePrescription({
        medico: medico.trim() || null,
        data_receita: date || null,
        medicamentos: items.map(({ precisa_revisar: _, ...item }) => item),
      });
      navigate('medications');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Não foi possível salvar a receita.');
      setSaving(false);
    }
  };

  const updateItem = (index: number, key: keyof Medicamento, value: string) =>
    setItems(prev => prev.map((item, i) => (i === index ? { ...item, [key]: value } : item)));

  if (step === 'choose') {
    const options: { icon: IconName; title: string; hint: string; onClick: () => void }[] = [
      { icon: 'camera', title: 'Tirar foto', hint: 'Use a câmera do seu dispositivo', onClick: () => cameraInput.current?.click() },
      { icon: 'folder', title: 'Enviar arquivo', hint: 'JPG ou PNG de até 10 MB', onClick: () => fileInput.current?.click() },
      { icon: 'edit', title: 'Preencher manualmente', hint: 'Digite as informações diretamente', onClick: () => setStep('manual') },
    ];

    return (
      <div className="max-w-md mx-auto animate-fade-in">
        <div className="rounded-lg p-8 text-center space-y-6" style={cardStyle}>
          <div>
            <div className="w-12 h-12 rounded-md flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--muted)', color: 'var(--brand)' }}>
              <Icon name="document" className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-semibold mb-2" style={{ color: 'var(--brand-dark)' }}>
              Adicionar documento
            </h2>
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
              Como você quer enviar o documento?
            </p>
          </div>

          {/* Inputs nativos: no celular, `capture` abre a câmera direto */}
          <input ref={cameraInput} type="file" accept="image/jpeg,image/png" capture="environment" hidden onChange={onPick} />
          <input ref={fileInput} type="file" accept="image/jpeg,image/png" hidden onChange={onPick} />

          <div className="space-y-3">
            {options.map(option => (
              <button
                key={option.title}
                onClick={option.onClick}
                className="w-full flex items-center gap-4 p-4 rounded-lg text-left transition-colors border border-[var(--border)] hover:border-[var(--primary)]"
                style={{ background: 'var(--card)' }}
              >
                <div className="w-10 h-10 rounded-md flex items-center justify-center shrink-0" style={{ background: 'var(--muted)', color: 'var(--brand)' }}>
                  <Icon name={option.icon} className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>{option.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{option.hint}</p>
                </div>
              </button>
            ))}
          </div>

          <button onClick={() => navigate('documents')} className="text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  if (step === 'analyzing') {
    return (
      <div className="max-w-md mx-auto animate-fade-in">
        <div className="rounded-lg p-12 text-center space-y-6" style={cardStyle}>
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 rounded-full" style={{ background: 'var(--muted)' }} />
            <div
              className="absolute inset-2 rounded-full animate-spin-slow"
              style={{ border: '3px solid transparent', borderTopColor: 'var(--primary)', borderRightColor: 'var(--primary)' }}
            />
            <div className="absolute inset-0 flex items-center justify-center" style={{ color: 'var(--brand)' }}>
              <Icon name="search" className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-semibold mb-2" style={{ color: 'var(--brand-dark)' }}>
              Analisando seu documento...
            </h2>
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
              Nossa IA está lendo a receita. Isso pode levar alguns segundos.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="max-w-md mx-auto animate-slide-up">
        <div className="rounded-lg p-8 text-center space-y-6" style={cardStyle}>
          <div className="w-12 h-12 rounded-md flex items-center justify-center mx-auto" style={{ background: '#fef2f2', color: '#b91c1c' }}>
            <Icon name="alert" className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold mb-2" style={{ color: 'var(--brand-dark)' }}>
              Não foi possível identificar as informações
            </h2>
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{error}</p>
          </div>
          <div className="space-y-3">
            <button onClick={restart} className={`w-full ${btnPrimary}`}>Tentar novamente</button>
            <button onClick={() => setStep('manual')} className={`w-full ${btnSecondary}`}>Preencher manualmente</button>
          </div>
        </div>
      </div>
    );
  }

  // review | manual
  return (
    <div className={`${preview ? 'max-w-5xl' : 'max-w-lg'} mx-auto animate-slide-up space-y-5`}>
      {step === 'review' && (needsReview ? (
        <Banner tone="warn" title="Algumas informações precisam ser confirmadas" text="A leitura não ficou totalmente clara. Confira os medicamentos destacados com a foto antes de salvar." />
      ) : (
        <Banner tone="ok" title="Receita lida com sucesso" text="Confira os dados antes de salvar." />
      ))}
      {step === 'manual' && rawText !== null && (
        <Banner tone="warn" title="A leitura automática não ficou disponível agora" text="Preencha os campos conferindo a foto e o texto capturado abaixo." />
      )}

      <div className={preview ? 'grid gap-5 lg:grid-cols-2 items-start' : ''}>
        {preview && (
          <div className="rounded-lg p-3 space-y-3 lg:sticky lg:top-0" style={cardStyle}>
            <img src={preview} alt="Foto da receita enviada" className="w-full max-h-[32rem] object-contain rounded-md" style={{ background: 'var(--muted)' }} />
            {rawText && (
              <pre className="text-xs whitespace-pre-wrap p-3 rounded-md font-[inherit]" style={{ background: 'var(--muted)', color: 'var(--foreground)' }}>
                {rawText}
              </pre>
            )}
          </div>
        )}

        <form
          className="rounded-lg p-6 space-y-5"
          style={cardStyle}
          onSubmit={save}
        >
          <h2 className="text-2xl font-semibold" style={{ color: 'var(--brand-dark)' }}>
            {step === 'review' ? 'Revisar informações' : 'Preencher manualmente'}
          </h2>

          {items.map((item, index) => (
            <div
              key={index}
              role="group"
              aria-label={`Medicamento ${index + 1}`}
              className="rounded-lg p-4 space-y-4"
              style={{
                border: item.precisa_revisar ? '1.5px solid #f59e0b' : '1px solid var(--border)',
                boxShadow: item.precisa_revisar ? '0 0 0 3px rgba(245,158,11,0.12)' : 'none',
              }}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold" style={{ color: 'var(--brand-dark)' }}>
                  Medicamento {index + 1}
                </p>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setItems(prev => prev.filter((_, i) => i !== index))}
                    className="text-xs font-medium"
                    style={{ color: 'var(--muted-foreground)' }}
                  >
                    Remover
                  </button>
                )}
              </div>
              {item.precisa_revisar && <p className="text-xs -mt-2" style={{ color: '#b45309' }}>Confira este medicamento com a foto</p>}

              {itemFields.map(field => (
                <Field key={field.key} label={field.label}>
                  <input
                    type="text"
                    required={field.key === 'medicamento'}
                    value={item[field.key]}
                    placeholder={field.placeholder}
                    onChange={e => updateItem(index, field.key, e.target.value)}
                    className={inputClass}
                    style={{ color: 'var(--foreground)' }}
                  />
                </Field>
              ))}
            </div>
          ))}

          <button
            type="button"
            onClick={() => setItems(prev => [...prev, emptyItem])}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border border-dashed border-[var(--border)] hover:border-[var(--primary)]"
            style={{ color: 'var(--brand)' }}
          >
            <Icon name="plus" className="w-4 h-4" />
            Adicionar medicamento
          </button>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Médico">
              <input type="text" value={medico} placeholder="Ex.: Dr. Carlos Mendes" onChange={e => setMedico(e.target.value)} className={inputClass} style={{ color: 'var(--foreground)' }} />
            </Field>
            <Field label="Data da receita">
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputClass} style={{ color: 'var(--foreground)' }} />
            </Field>
          </div>

          {saveError && <Banner tone="warn" title="Não foi possível salvar" text={saveError} />}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => navigate('documents')} className={`flex-1 ${btnSecondary}`}>Cancelar</button>
            <button type="submit" disabled={saving} className={`flex-1 ${btnPrimary} disabled:opacity-60`}>
              {saving ? 'Salvando...' : 'Confirmar e salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>{label}</span>
      {children}
    </label>
  );
}

function Banner({ tone, title, text }: { tone: 'ok' | 'warn'; title: string; text: string }) {
  const c = tone === 'ok'
    ? { bg: '#f0fdf4', border: '#86efac', title: '#166534', text: '#15803d', icon: 'check' as const }
    : { bg: '#fffbeb', border: '#fbbf24', title: '#92400e', text: '#b45309', icon: 'alert' as const };
  return (
    <div className="flex items-start gap-3 p-4 rounded-lg" style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.title }}>
      <Icon name={c.icon} className="w-5 h-5 shrink-0" />
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs mt-1" style={{ color: c.text }}>{text}</p>
      </div>
    </div>
  );
}
