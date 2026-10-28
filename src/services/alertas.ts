import { useEffect, useState } from 'react';
import type { Lembrete } from './prescriptions';

// Liga/desliga de cada lembrete. A API ainda não guarda isso, então fica neste navegador.
// ponytail: localStorage, vira campo no backend quando os lembretes tiverem tabela própria.
const CHAVE = 'safepass:lembretes-ligados';
const EVENTO = 'safepass:lembretes-ligados';

function ler(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(CHAVE) ?? '{}');
  } catch {
    return {};
  }
}

let ligados = ler(); // memória primeiro: sem localStorage (aba privada), o liga/desliga vale até recarregar

/** Mesma chave para a tela de Lembretes e para o agendador dos avisos. */
export const chaveLembrete = (label: string, horario: string, dias: string) => `${label} ${horario} ${dias}`;

export const chaveDoLembrete = (l: Lembrete) =>
  chaveLembrete(`${l.medicamento} ${l.dose}`.trim(), l.horario, l.periodo ? `Diário por ${l.periodo}` : 'Diário');

export function useLembretesLigados() {
  const [estado, setEstado] = useState(ligados);

  useEffect(() => {
    const atualizar = () => setEstado(ligados);
    window.addEventListener(EVENTO, atualizar);
    return () => window.removeEventListener(EVENTO, atualizar);
  }, []);

  const alternar = (chave: string, ligado: boolean) => {
    ligados = { ...ligados, [chave]: ligado };
    try {
      localStorage.setItem(CHAVE, JSON.stringify(ligados));
    } catch {
      // sem armazenamento: segue só em memória
    }
    window.dispatchEvent(new Event(EVENTO));
  };

  return [estado, alternar] as const;
}
