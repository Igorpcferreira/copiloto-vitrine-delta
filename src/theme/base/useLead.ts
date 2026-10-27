"use client";

import { useState, useTransition } from "react";
import { submitLead } from "@/lib/actions";
import { maskPhoneBR, unmaskPhone } from "@/lib/format";

export type CampoLead = "nome" | "telefone" | "email";

export const ERROS_LEAD: Record<CampoLead, string> = {
  nome: "Informe seu nome.",
  telefone: "Informe um telefone com DDD.",
  email: "Informe um e-mail válido.",
};

/** A demo bloqueia todo envio (`VITRINE_DEMO`, persistida no build pelo next.config). */
export const DEMO = process.env.VITRINE_DEMO === "true";

/**
 * Contato da página do veículo: os mesmos campos e o mesmo `submitLead`
 * (`source: "vitrine-veiculo"`) do site. Erros só depois da primeira tentativa. Na demo nada
 * é enviado e o estado de enviado aparece do mesmo jeito, com o aviso; fora dela, `falhou`.
 */
export function useLead({ vehicleId, mensagemInicial }: { vehicleId: string; mensagemInicial: string }) {
  const [nome, setNome] = useState("");
  const [telefone, setTelefoneBruto] = useState("");
  const [email, setEmail] = useState("");
  const [mensagem, setMensagem] = useState(mensagemInicial);
  const [tentou, setTentou] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [falhou, setFalhou] = useState(false);
  const [pendente, iniciar] = useTransition();

  const invalidos: CampoLead[] = [
    ...(!nome.trim() ? (["nome"] as const) : []),
    ...(unmaskPhone(telefone).length < 10 ? (["telefone"] as const) : []),
    ...(email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? (["email"] as const) : []),
  ];
  const erro = (campo: CampoLead) => (tentou && invalidos.includes(campo) ? ERROS_LEAD[campo] : undefined);

  /** `aoEnviar` roda na hora do envio, ainda no clique (o navegador só deixa abrir uma aba aí). */
  const enviar = (aoEnviar?: () => void) => {
    setTentou(true);
    if (invalidos.length || pendente || enviado) return invalidos[0];
    aoEnviar?.();
    iniciar(async () => {
      const res = await submitLead({
        vehicleId,
        name: nome.trim(),
        phone: unmaskPhone(telefone),
        email: email.trim() || undefined,
        message: mensagem.trim() || undefined,
        source: "vitrine-veiculo",
      });
      // Na demo nada é enviado e o estado de enviado aparece do mesmo jeito (com o aviso);
      // fora dela, uma falha de envio fica visível para a pessoa tentar pelo WhatsApp.
      setEnviado(res.ok || DEMO);
      setFalhou(!res.ok && !DEMO);
    });
    return undefined;
  };

  return {
    nome, setNome,
    telefone, setTelefone: (v: string) => setTelefoneBruto(maskPhoneBR(v)),
    email, setEmail,
    mensagem, setMensagem,
    erro, enviar, enviado, falhou, pendente,
    reiniciar: () => {
      setEnviado(false);
      setFalhou(false);
      setTentou(false);
    },
  };
}
