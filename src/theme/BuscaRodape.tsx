"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import type { StockNoun } from "@/lib/stock-noun";
import { ArrowRightIcon, SearchIcon } from "./base/icones";

/**
 * Busca do rodapé: quem chegou ao fim da página sem achar o carro procura no estoque dali
 * mesmo, pelo mesmo `q` do Comprar. Funciona sem JavaScript (formulário GET para o Comprar).
 */
export default function BuscaRodape({ base, noun }: { base: string; noun: StockNoun }) {
  const router = useRouter();
  const id = useId();
  const [texto, setTexto] = useState("");

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const q = texto.trim();
    router.push(q ? `${base}/comprar?q=${encodeURIComponent(q)}` : `${base}/comprar`);
  };

  return (
    <form className="dl-rod__busca" role="search" action={`${base}/comprar`} onSubmit={enviar}>
      <label htmlFor={`${id}-q`} className="dl-rod__busca-rotulo">
        Procurando {noun.feminine ? "uma" : "um"} {noun.singular}?
      </label>
      <div className="dl-rod__busca-linha">
        <SearchIcon size={18} />
        <input
          id={`${id}-q`}
          name="q"
          type="search"
          placeholder="Marca, modelo ou ano"
          autoComplete="off"
          enterKeyHint="search"
          maxLength={120}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        <button type="submit" aria-label="Buscar no estoque">
          <ArrowRightIcon size={18} />
        </button>
      </div>
    </form>
  );
}
