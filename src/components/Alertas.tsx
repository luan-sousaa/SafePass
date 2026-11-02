import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { chaveDoLembrete, useLembretesLigados } from '../services/alertas';
import { useList, type Lembrete } from '../services/prescriptions';
import { hojeISO, registrarDose } from '../services/saude';

const INTERVALO_MS = 30_000;
const REAVISO_MS = 15 * 60_000;

type Aviso = { id: number; lembrete: Lembrete; data: string; erro?: string };
const texto = (l: Lembrete) => `${l.medicamento} ${l.dose}`.trim();

const suportaNotificacao = () => 'Notification' in window;
const minutos = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const minutosAgora = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};

/**
 * Avisa no horário de cada lembrete ligado: notificação do navegador se o usuário deixou,
 * e sempre um aviso dentro do app, que é onde fica o botão "Tomei". Sem resposta, avisa de novo
 * uma única vez 15 min depois (spec notificacoes-medicamentos, FR-9). Fica montado no App.
 *
 * ponytail: notificação sem service worker não aceita botões, por isso o "Tomei" vive no aviso
 * do app; com o service worker do push, ele vira uma action da própria notificação.
 *
 * ponytail: só funciona com o app aberto (o timer morre com a aba). Para avisar com o app
 * fechado, o caminho é service worker + push (FCM) disparado pelo backend, como prevê a stack.
 */
export default function Alertas() {
  const [versao, setVersao] = useState(0);
  const lembretes = useList<Lembrete>('/api/reminders', versao);
  const [ligados] = useLembretesLigados();
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const reavisos = useRef(new Map<string, ReturnType<typeof setTimeout>>()); // por dose: ref + data + horário
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
        if (!l.horario) continue; // vacina: lembrete por data, sem hora para avisar
        const m = minutos(l.horario);
        if (desde < m && m <= agora && !l.tomada && (ligados[chaveDoLembrete(l)] ?? true)) avisar(l, hojeISO(), true);
      }
      setVersao(v => v + 1); // busca a lista de novo: receita nova ou apagada entra no próximo ciclo
    }, INTERVALO_MS);
    return () => clearInterval(id);
  }, []);

  const doseId = (l: Lembrete, data: string) => `${l.ref} ${data} ${l.horario}`;

  const avisar = (l: Lembrete, data: string, reavisar: boolean) => {
    if (suportaNotificacao() && Notification.permission === 'granted') {
      const body = [`${texto(l)} · ${l.horario}`, l.ultimo_dia && 'Seu tratamento termina hoje'].filter(Boolean).join('\n');
      const n = new Notification('Hora do medicamento', { body, tag: chaveDoLembrete(l) });
      n.onclick = () => window.focus();
    }
    setAvisos(prev => [...prev.filter(a => doseId(a.lembrete, a.data) !== doseId(l, data)), { id: Date.now() + Math.random(), lembrete: l, data }]);
    if (!reavisar) return;
    reavisos.current.set(doseId(l, data), setTimeout(() => {
      reavisos.current.delete(doseId(l, data));
      // Lista mais recente: dose marcada em outra aba ou lembrete desligado não reavisa.
      const agora = atual.current.lembretes.find(x => x.ref === l.ref && x.horario === l.horario);
      if (agora && !agora.tomada && (atual.current.ligados[chaveDoLembrete(agora)] ?? true)) avisar(agora, data, false);
    }, REAVISO_MS));
  };

  const fechar = (id: number) => setAvisos(prev => prev.filter(a => a.id !== id));

  const tomei = async ({ id, lembrete, data }: Aviso) => {
    try {
      await registrarDose({ ref: lembrete.ref!, data, horario: lembrete.horario! });
      clearTimeout(reavisos.current.get(doseId(lembrete, data)));
      reavisos.current.delete(doseId(lembrete, data));
      fechar(id);
      setVersao(v => v + 1);
    } catch (err) {
      const erro = err instanceof Error ? err.message : 'Não foi possível registrar a dose.';
      setAvisos(prev => prev.map(a => (a.id === id ? { ...a, erro } : a)));
    }
  };

  if (avisos.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[calc(100%-2rem)] max-w-sm space-y-3">
      {avisos.map(aviso => (
        <div
          key={aviso.id}
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
              {texto(aviso.lembrete)} · {aviso.lembrete.horario}
            </p>
            {aviso.lembrete.ultimo_dia && (
              <p className="text-xs font-semibold mt-1" style={{ color: 'var(--brand)' }}>Seu tratamento termina hoje</p>
            )}
            {aviso.erro && <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>{aviso.erro}</p>}
            <button
              onClick={() => tomei(aviso)}
              className="mt-3 px-4 py-1.5 rounded-lg text-sm font-semibold text-white"
              style={{ background: 'var(--primary)' }}
            >
              Tomei
            </button>
          </div>
          <button
            aria-label="Fechar aviso"
            onClick={() => fechar(aviso.id)}
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
