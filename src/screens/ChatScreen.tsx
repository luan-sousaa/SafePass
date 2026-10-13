import { useState, useRef, useEffect } from 'react';
import Icon, { type IconName } from '../components/Icon';

type Role = 'user' | 'agent';

interface Message {
  id: number;
  role: Role;
  text: string;
  time: string;
}

const SUGGESTIONS = [
  'Quais são meus medicamentos ativos?',
  'Quando é minha próxima consulta?',
  'Tenho vacinas em atraso?',
  'Resumo da minha saúde esta semana',
];

const RESPONSES: Record<string, string> = {
  default: 'Entendido! Posso ajudá-lo com informações sobre seus documentos, medicamentos, lembretes e dependentes cadastrados no SAFEpass. Como posso auxiliar?',
  medicamentos: 'Você tem **5 medicamentos ativos** no momento:\n\n• Omeprazol 20mg — 1x ao dia (08:00)\n• Vitamina D 2000UI — 1x ao dia (19:00)\n• Amoxicilina 500mg — 3x ao dia\n• Ômega 3 1000mg — 2x ao dia\n• Losartana 50mg — 1x ao dia (07:00)\n\nDeseja detalhes sobre algum deles?',
  consulta: 'Sua próxima consulta agendada é:\n\n**Dermatologia** com Dra. Beatriz Costa\n28 de setembro de 2026 às 14:30\n\nVocê tem lembrete configurado para este evento.',
  vacina: 'Analisando seu histórico de vacinação...\n\nSua última vacina foi **Influenza 2026** em 02/09/2026. Você está em dia com o calendário vacinal básico. Próxima recomendada: **Hepatite B – 3ª dose** (agendar até outubro).',
  resumo: 'Aqui está o resumo da sua saúde esta semana:\n\n**4 documentos** adicionados\n**5 medicamentos** em uso regular\n**3 lembretes** programados\nAderência aos medicamentos: **92%**\n\nTudo dentro do esperado.',
};

function getResponse(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('medicament') || lower.includes('remédio') || lower.includes('med')) return RESPONSES.medicamentos;
  if (lower.includes('consulta') || lower.includes('próxima')) return RESPONSES.consulta;
  if (lower.includes('vacina') || lower.includes('imuniza')) return RESPONSES.vacina;
  if (lower.includes('resumo') || lower.includes('semana') || lower.includes('saúde')) return RESPONSES.resumo;
  return RESPONSES.default;
}

function nowStr() {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function BubbleText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <span className="text-sm leading-relaxed whitespace-pre-wrap">
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**')
          ? <strong key={i}>{p.slice(2, -2)}</strong>
          : p
      )}
    </span>
  );
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      role: 'agent',
      text: 'Olá! Sou o assistente de saúde do SAFEpass.\n\nPosso ajudá-lo a consultar seus documentos, medicamentos, próximas consultas e muito mais. Como posso ajudá-lo hoje?',
      time: nowStr(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const nextId = useRef(1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const send = (text: string) => {
    if (!text.trim() || isTyping) return;
    setMessages(prev => [...prev, { id: nextId.current++, role: 'user', text: text.trim(), time: nowStr() }]);
    setInput('');
    setIsTyping(true);
    setTimeout(() => {
      setMessages(prev => [...prev, { id: nextId.current++, role: 'agent', text: getResponse(text), time: nowStr() }]);
      setIsTyping(false);
    }, 900 + Math.random() * 900);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
  };

  const showSuggestions = messages.length <= 1;

  return (
    <div className="flex h-full" style={{ background: 'var(--app-surface)' }}>
      {/* Chat panel */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* Agent bar */}
        <div
          className="flex items-center gap-3 px-6 py-3 border-b shrink-0"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
        >
          <div className="relative shrink-0">
            <div
              className="w-9 h-9 rounded-md flex items-center justify-center"
              style={{ background: 'var(--muted)', color: 'var(--brand)' }}
            >
              <Icon name="assistant" className="w-4 h-4" />
            </div>
            <span
              className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
              style={{ background: '#22c55e', borderColor: 'var(--card)' }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-none" style={{ color: 'var(--brand-dark)' }}>
              Assistente SAFEpass
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>Disponível agora</p>
          </div>
          <span
            className="text-xs px-2.5 py-1 rounded-md font-medium shrink-0"
            style={{ background: 'var(--muted)', color: 'var(--brand)', border: '1px solid var(--border)' }}
          >
            IA de saúde
          </span>
        </div>

        {/* Messages area */}
        <div
          className="flex-1 overflow-y-auto px-5 py-5 space-y-5"
          style={{ background: 'var(--app-surface)' }}
        >
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex items-end gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {msg.role === 'agent' && (
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 mb-4"
                  style={{ background: 'var(--muted)', color: 'var(--brand)' }}
                >
                  <Icon name="assistant" className="w-3.5 h-3.5" />
                </div>
              )}

              <div className={`flex flex-col gap-1 max-w-[72%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className="px-4 py-3"
                  style={
                    msg.role === 'user'
                      ? {
                          background: 'var(--primary)',
                          color: '#fff',
                          borderRadius: '8px 8px 2px 8px',
                        }
                      : {
                          background: 'var(--card)',
                          color: 'var(--foreground)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px 8px 8px 2px',
                        }
                  }
                >
                  <BubbleText text={msg.text} />
                </div>
                <p className="text-xs px-1" style={{ color: 'var(--muted-foreground)' }}>{msg.time}</p>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex items-end gap-2.5">
              <div
                className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                style={{ background: 'var(--muted)', color: 'var(--brand)' }}
              >
                <Icon name="assistant" className="w-3.5 h-3.5" />
              </div>
              <div
                className="px-4 py-3.5"
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px 8px 8px 2px',
                }}
              >
                <div className="flex items-center gap-1.5">
                  {[0, 1, 2].map(i => (
                    <span
                      key={i}
                      className="w-2 h-2 rounded-full animate-bounce"
                      style={{
                        background: 'var(--muted-foreground)',
                        animationDelay: `${i * 0.18}s`,
                        animationDuration: '0.9s',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Suggestions */}
          {showSuggestions && (
            <div className="pt-2 space-y-2">
              <p className="text-xs font-medium px-1" style={{ color: 'var(--muted-foreground)' }}>Perguntas frequentes</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-xs px-3.5 py-2 rounded-md font-medium transition-colors"
                    style={{
                      background: 'var(--card)',
                      color: 'var(--brand)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div
          className="shrink-0 px-5 py-4 border-t"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
        >
          <div
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all"
            style={{
              background: 'var(--muted)',
              border: '1.5px solid var(--border)',
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Pergunte sobre sua saúde..."
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: 'var(--foreground)' }}
              disabled={isTyping}
              onFocus={e => { (e.target.parentElement as HTMLElement).style.borderColor = 'var(--primary)'; (e.target.parentElement as HTMLElement).style.boxShadow = '0 0 0 3px rgba(13,148,136,0.1)'; }}
              onBlur={e => { (e.target.parentElement as HTMLElement).style.borderColor = 'var(--border)'; (e.target.parentElement as HTMLElement).style.boxShadow = 'none'; }}
            />
            <button
              onClick={() => { send(input); inputRef.current?.focus(); }}
              disabled={!input.trim() || isTyping}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-35 hover:opacity-90 active:scale-95 shrink-0"
              style={{ background: 'var(--primary)' }}
            >
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
          <p className="text-center text-xs mt-2.5" style={{ color: 'var(--muted-foreground)' }}>
            O assistente usa apenas os dados do seu SAFEpass.
          </p>
        </div>
      </div>

      {/* Right info panel – desktop only */}
      <div
        className="hidden xl:flex flex-col w-72 border-l shrink-0"
        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
      >
        <div className="px-5 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>
            Seu resumo
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {[
            { label: 'Documentos', value: '47', icon: 'document' as IconName },
            { label: 'Medicamentos', value: '5 ativos', icon: 'medication' as IconName },
            { label: 'Próxima consulta', value: '28 set', icon: 'user' as IconName },
            { label: 'Lembretes hoje', value: '2', icon: 'reminder' as IconName },
          ].map(item => (
            <div
              key={item.label}
              className="flex items-center gap-3 p-3 rounded-lg"
              style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}
            >
              <div
                className="w-9 h-9 rounded-md flex items-center justify-center shrink-0"
                style={{ background: 'var(--card)', color: 'var(--brand)' }}
              >
                <Icon name={item.icon} className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{item.label}</p>
                <p className="text-sm font-semibold" style={{ color: 'var(--brand-dark)' }}>
                  {item.value}
                </p>
              </div>
            </div>
          ))}

          <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--muted-foreground)' }}>
              Atalhos rápidos
            </p>
            <div className="space-y-2">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => { /* focus handled externally */ }}
                  className="w-full text-left text-xs px-3 py-2.5 rounded-lg transition-colors hover:bg-[var(--muted)]"
                  style={{ color: 'var(--brand)', border: '1px solid var(--border)' }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
