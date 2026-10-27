"use client";

import Image from "next/image";
import { useRef, useState, type PointerEvent as EventoPonteiro } from "react";
import { AnimatePresence, m } from "motion/react";
import { isRenderableImageSrc } from "@/lib/image-src";
import Dialogo from "./base/Dialogo";
import { useMovimentoReduzido } from "./base/ganchos";
import { ArrowLeftIcon, ArrowRightIcon, XIcon } from "./base/icones";

/**
 * Visor do Delta: a foto inteira em tela cheia (página do veículo e fotos da loja). Setas, teclado
 * e arraste; o movimento segue o lado pedido: "próxima" e arrastar para a direita levam a foto
 * para a direita (regra do usuário, 21/10/2026).
 */
export default function Visor({
  fotos,
  titulo,
  rotulo = `Fotos do ${titulo}`,
  inicial,
  aoFechar,
}: {
  fotos: string[];
  /** Nome no texto alternativo de cada foto ("{titulo}, foto 2 de 8"). */
  titulo: string;
  /** Nome do diálogo. */
  rotulo?: string;
  inicial: number | null;
  aoFechar: () => void;
}) {
  const [atual, setAtual] = useState(0);
  const [sentido, setSentido] = useState<1 | -1>(1);
  const [aberto, setAberto] = useState<number | null>(null);
  const reduzido = useMovimentoReduzido();
  const arraste = useRef<{ x: number; id: number } | null>(null);
  const n = fotos.length;
  // Ao abrir, começa na foto pedida (ajuste durante a renderização, sem efeito).
  if (inicial !== aberto) {
    setAberto(inicial);
    if (inicial !== null) setAtual(inicial);
  }

  // "Seguinte" anda para a direita: a foto da vez sai pela direita e a outra entra pela esquerda.
  const andar = (lado: 1 | -1) => {
    setSentido(lado);
    setAtual((i) => (i + lado + n) % n);
  };

  const teclas = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") andar(1);
    else if (e.key === "ArrowLeft") andar(-1);
    else return;
    e.preventDefault();
  };
  const soltar = (e: EventoPonteiro) => {
    const a = arraste.current;
    arraste.current = null;
    if (!a || a.id !== e.pointerId) return;
    const dx = e.clientX - a.x;
    if (Math.abs(dx) > 48) andar(dx > 0 ? 1 : -1);
  };

  return (
    <Dialogo aberto={inicial !== null} aoFechar={aoFechar} rotulo={rotulo} className="dl dl-visor">
      <div className="dl-visor__corpo" onKeyDown={teclas}>
        <div className="dl-visor__topo">
          <p className="dl-visor__conta" aria-live="polite">
            Foto {atual + 1} de {n}
          </p>
          <button type="button" className="dl-visor__fechar" aria-label="Fechar as fotos" onClick={aoFechar}>
            <XIcon size={22} />
          </button>
        </div>
        <div
          className="dl-visor__palco"
          onPointerDown={(e) => {
            arraste.current = { x: e.clientX, id: e.pointerId };
          }}
          onPointerUp={soltar}
          onPointerCancel={() => {
            arraste.current = null;
          }}
        >
          <AnimatePresence initial={false} custom={sentido} mode="popLayout">
            <m.div
              key={atual}
              className="dl-visor__foto"
              custom={sentido}
              variants={{
                entra: (s: number) => ({ opacity: 0, x: reduzido ? 0 : -s * 90 }),
                fica: { opacity: 1, x: 0 },
                sai: (s: number) => ({ opacity: 0, x: reduzido ? 0 : s * 90 }),
              }}
              initial="entra"
              animate="fica"
              exit="sai"
              transition={{ duration: reduzido ? 0 : 0.32, ease: [0.22, 1, 0.36, 1] }}
            >
              {isRenderableImageSrc(fotos[atual]) && (
                <Image src={fotos[atual]} alt={`${titulo}, foto ${atual + 1} de ${n}`} fill sizes="100vw" draggable={false} />
              )}
            </m.div>
          </AnimatePresence>
        </div>
        {n > 1 && (
          <div className="dl-visor__setas">
            <button type="button" className="dl-seta dl-visor__seta" aria-label="Foto anterior" onClick={() => andar(-1)}>
              <ArrowLeftIcon size={20} />
            </button>
            <button type="button" className="dl-seta dl-visor__seta" aria-label="Próxima foto" onClick={() => andar(1)}>
              <ArrowRightIcon size={20} />
            </button>
          </div>
        )}
      </div>
    </Dialogo>
  );
}
