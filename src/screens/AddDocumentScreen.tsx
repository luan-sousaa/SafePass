import { useState } from 'react';
import type { Screen } from '../types';
import Icon from '../components/Icon';

type Step = 'choose' | 'analyzing' | 'review' | 'error' | 'manual';

export default function AddDocumentScreen({ navigate }: { navigate: (s: Screen) => void }) {
  const [step, setStep] = useState<Step>('choose');
  const [hasWarning, setHasWarning] = useState(false);
  const [form, setForm] = useState({
    medicamento: 'Amoxicilina 500mg',
    dosagem: '500 mg',
    posologia: '1 cápsula a cada 8 horas',
    periodo: '7 dias',
    data: '18/09/2026',
  });

  const handleUpload = (type: 'photo' | 'file') => {
    setStep('analyzing');
    setTimeout(() => {
      const fail = Math.random() < 0.2;
      if (fail) { setStep('error'); return; }
      setHasWarning(Math.random() < 0.5);
      setStep('review');
    }, 2800);
  };

  if (step === 'choose') {
    return (
      <div className="max-w-md mx-auto animate-fade-in">
        <div className="rounded-lg p-8 text-center space-y-6" style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
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

          <div className="space-y-3">
            <button
              onClick={() => handleUpload('photo')}
              className="w-full flex items-center gap-4 p-4 rounded-lg text-left transition-colors"
              style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
            >
              <div className="w-10 h-10 rounded-md flex items-center justify-center shrink-0" style={{ background: 'var(--muted)', color: 'var(--brand)' }}>
                <Icon name="camera" className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>Tirar foto</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>Use a câmera do seu dispositivo</p>
              </div>
            </button>

            <button
              onClick={() => handleUpload('file')}
              className="w-full flex items-center gap-4 p-4 rounded-lg text-left transition-colors"
              style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
            >
              <div className="w-10 h-10 rounded-md flex items-center justify-center shrink-0" style={{ background: 'var(--muted)', color: 'var(--brand)' }}>
                <Icon name="folder" className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>Enviar arquivo</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>PDF, JPG ou PNG de até 20MB</p>
              </div>
            </button>

            <button
              onClick={() => setStep('manual')}
              className="w-full flex items-center gap-4 p-4 rounded-lg text-left transition-colors"
              style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
            >
              <div className="w-10 h-10 rounded-md flex items-center justify-center shrink-0" style={{ background: 'var(--muted)', color: 'var(--brand)' }}>
                <Icon name="edit" className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>Preencher manualmente</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>Digite as informações diretamente</p>
              </div>
            </button>
          </div>

          <button
            onClick={() => navigate('documents')}
            className="text-sm font-medium"
            style={{ color: 'var(--muted-foreground)' }}
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  if (step === 'analyzing') {
    return (
      <div className="max-w-md mx-auto animate-fade-in">
        <div className="rounded-lg p-12 text-center space-y-6" style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 rounded-full" style={{ background: 'rgba(13,148,136,0.15)' }} />
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
              Nossa IA está extraindo as informações. Isso leva alguns segundos.
            </p>
          </div>
          <div className="space-y-2">
            {['Lendo o documento', 'Identificando campos', 'Extraindo dados'].map((s, i) => (
              <div key={i} className="flex items-center gap-3 text-left px-4">
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(13,148,136,0.15)' }}>
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--primary)' }} />
                </div>
                <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{s}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="max-w-md mx-auto animate-slide-up">
        <div className="rounded-lg p-8 text-center space-y-6" style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
          <div className="w-12 h-12 rounded-md flex items-center justify-center mx-auto" style={{ background: '#fef2f2', color: '#b91c1c' }}>
            <Icon name="alert" className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold mb-2" style={{ color: 'var(--brand-dark)' }}>
              Não foi possível identificar as informações
            </h2>
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
              A imagem pode estar com baixa qualidade ou o documento não é reconhecível.
            </p>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => { setStep('choose'); }}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: 'var(--primary)' }}
            >
              Tentar novamente
            </button>
            <button
              onClick={() => setStep('manual')}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'var(--muted)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
            >
              Preencher manualmente
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'review' || step === 'manual') {
    return (
      <div className="max-w-lg mx-auto animate-slide-up space-y-5">
        {hasWarning && step === 'review' && (
          <div className="flex items-start gap-3 p-4 rounded-lg" style={{ background: '#fffbeb', border: '1px solid #fbbf24' }}>
            <Icon name="alert" className="w-5 h-5 shrink-0" />
            <div>
              <p className="text-sm font-semibold" style={{ color: '#92400e' }}>Algumas informações precisam ser confirmadas</p>
              <p className="text-xs mt-1" style={{ color: '#b45309' }}>Revise os campos destacados antes de salvar.</p>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="flex items-center gap-2 p-4 rounded-lg" style={{ background: '#f0fdf4', border: '1px solid #86efac' }}>
            <Icon name="check" className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium" style={{ color: '#166534' }}>Documento analisado com sucesso</p>
          </div>
        )}

        <div className="rounded-lg p-6 space-y-5" style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
          <h2 className="text-2xl font-semibold" style={{ color: 'var(--brand-dark)' }}>
            {step === 'review' ? 'Revisar informações' : 'Preencher manualmente'}
          </h2>

          {Object.entries(form).map(([key, val]) => {
            const labels: Record<string, string> = {
              medicamento: 'Medicamento',
              dosagem: 'Dosagem',
              posologia: 'Posologia',
              periodo: 'Período',
              data: 'Data',
            };
            const warn = hasWarning && step === 'review' && (key === 'dosagem' || key === 'periodo');
            return (
              <div key={key} className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>
                  {labels[key]}
                </label>
                <input
                  type="text"
                  value={val}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{
                    background: 'var(--muted)',
                    color: 'var(--foreground)',
                    border: warn ? '1.5px solid #f59e0b' : '1.5px solid var(--border)',
                    boxShadow: warn ? '0 0 0 3px rgba(245,158,11,0.12)' : 'none',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(13,148,136,0.12)'; }}
                  onBlur={e => { e.target.style.borderColor = warn ? '#f59e0b' : 'var(--border)'; e.target.style.boxShadow = warn ? '0 0 0 3px rgba(245,158,11,0.12)' : 'none'; }}
                />
                {warn && <p className="text-xs" style={{ color: '#b45309' }}>Confirme este campo</p>}
              </div>
            );
          })}

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => navigate('documents')}
              className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'var(--muted)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
            >
              Cancelar
            </button>
            <button
              onClick={() => navigate('documents')}
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: 'var(--primary)' }}
            >
              Confirmar e salvar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
