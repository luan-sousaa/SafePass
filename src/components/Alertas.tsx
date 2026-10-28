import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { chaveDoLembrete, useLembretesLigados } from '../services/alertas';
import { useList, type Lembrete } from '../services/prescriptions';

const INTERVALO_MS = 30_000;

const suportaNotificacao = () => 'Notification' in window;
const minutos = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const minutosAgora = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};

/**
 * Avisa no horário de cada lembrete ligado: notificação do navegador se o usuário deixou,
 * senão um aviso dentro do app. Fica montado no App, em qualquer tela.
 *
 * ponytail: só funciona com o app aberto (o timer morre com a aba). Para avisar com o app
 * fechado, o caminho é service worker + push (FCM) disparado pelo backend, como prevê a stack.
 */
export default function Alertas() {
  const [versao, setVersao] = useState(0);
  const lembretes = useList<Lembrete>('/api/reminders', versao);
  const [ligados] = useLembretesLigados();
  const [avisos, setAvisos] = useState<{ id: number; lembrete: Lembrete }[]>([]);
  const atual = useRef({ lembretes, ligados });
  atual.current = { lembretes, ligados };
  const ultimaVerificacao = useRef(minutosAgora());

  useEffect(() => {
    const id = setInterval(() => {
      // Dispara o que caiu entre a última verificação e agora: aguenta timer atrasado (aba em
      // segundo plano) sem repetir aviso. Se virou o dia, recomeça da meia-noite.
      const agora = minutosAgora();
      const desde = agora < ultimaVerificacao.current ? -1 : ultimaVerificacao.current;
      ultimaVerificacao.current = agora;

      const { lembretes, ligados } = atual.current;
      for (const l of lembretes) {
        const m = minutos(l.horario);
        if (desde < m && m <= agora && (ligados[chaveDoLembrete(l)] ?? true)) avisar(l);
      }
      setVersao(v => v + 1); // busca a lista de novo: receita nova ou apagada entra no próximo ciclo
    }, INTERVALO_MS);
    return () => clearInterval(id);
  }, []);

  const avisar = (l: Lembrete) => {
    const texto = `${l.medicamento} ${l.dose}`.trim();
    if (suportaNotificacao() && Notification.permission === 'granted') {
      new Notification('Hora do medicamento', { body: `${texto} · ${l.horario}`, tag: chaveDoLembrete(l) });
    } else {
      setAvisos(prev => [...prev, { id: Date.now() + Math.random(), lembrete: l }]);
    }
  };

  if (avisos.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[calc(100%-2rem)] max-w-sm space-y-3">
      {avisos.map(({ id, lembrete }) => (
        <div
          key={id}
          role="alert"
          className="flex items-start gap-3 p-4 rounded-lg animate-slide-up"
          style={{ background: 'var(--card)', border: '1px solid var(--brand)', boxShadow: 'var(--shadow-app)' }}
        >
          <div className="w-9 h-9 rounded-md flex items-center justify-center shrink-0" style={{ background: 'var(--muted)', color: 'var(--brand)' }}>
            <Icon name="reminder" className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: 'var(--brand-dark)' }}>Hora do medicamento</p>
            <p className="text-sm mt-0.5" style={{ color: 'var(--foreground)' }}>
              {`${lembrete.medicamento} ${lembrete.dose}`.trim()} · {lembrete.horario}
            </p>
          </div>
          <button
            aria-label="Fechar aviso"
            onClick={() => setAvisos(prev => prev.filter(a => a.id !== id))}
            style={{ color: 'var(--muted-foreground)' }}
          >
            <Icon name="x" className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

/** Pede a permissão só quando o usuário clica (o navegador bloqueia pedido no carregamento). */
export function AtivarNotificacoes() {
  const [permissao, setPermissao] = useState(() => (suportaNotificacao() ? Notification.permission : 'unsupported'));

  const texto = {
    granted: 'Notificações ativas: o navegador avisa no horário de cada lembrete ligado, com o SAFEpass aberto.',
    denied: 'Notificações bloqueadas no navegador. Os avisos aparecem dentro do SAFEpass, com ele aberto.',
    unsupported: 'Este navegador não mostra notificações. Os avisos aparecem dentro do SAFEpass, com ele aberto.',
    default: 'Receba um aviso no horário de cada lembrete ligado, com o SAFEpass aberto.',
  }[permissao];

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 rounded-lg" style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}>
      <Icon name="reminder" className="w-5 h-5 shrink-0" />
      <p className="flex-1 min-w-[12rem] text-xs leading-relaxed" style={{ color: 'var(--brand-dark)' }}>{texto}</p>
      {permissao === 'default' && (
        <button
          onClick={() => Notification.requestPermission().then(setPermissao)}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white shrink-0"
          style={{ background: 'var(--primary)' }}
        >
          Ativar notificações
        </button>
      )}
    </div>
  );
}
