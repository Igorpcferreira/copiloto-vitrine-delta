"use client";

import Link from "next/link";
import { useState } from "react";
import styles from "./botoes-propostas.module.css";

const opcoes = [
  { id: "atual", nome: "Antes · Recortado", texto: "O desenho anterior, com os cantos recortados para comparar." },
  { id: "d", nome: "D · Reto", texto: "Só os cantos dos campos e controles ficam retos." },
  { id: "e", nome: "E · Canto leve", texto: "Aplicado no Delta. Só os cantos ganham uma curva pequena e discreta." },
  { id: "f", nome: "F · Canto curvo", texto: "Só os cantos ficam mais suaves, sem virar uma pílula." },
];

const anteriores = [
  { id: "a", nome: "A · Reto", texto: "Linhas limpas, cantos discretos e ações sólidas. Mais sóbrio." },
  { id: "b", nome: "B · Curva", texto: "Contornos suaves e ações circulares. Mais acolhedor." },
  { id: "c", nome: "C · Linha", texto: "Campos abertos e ações sublinhadas. Mais leve, com menos caixas." },
];

export default function BotoesPropostas() {
  const [opcao, setOpcao] = useState("e");
  const [celular, setCelular] = useState(false);
  const escolhida = [...opcoes, ...anteriores].find(item => item.id === opcao)!;
  return (
    <main className={`dl ${styles.pagina}`}>
      <nav className={styles.voltar}><Link href="/">Voltar ao Delta</Link><Link href="/propostas/categorias">Opções de categorias</Link></nav>
      <header className={styles.intro}><p>Delta · Ajuste dos cantos</p><h1>O desenho fica. Só o canto muda.</h1><span>O header e os botões inclinados continuam como no atual. D, E e F mudam apenas os cantos recortados dos campos e controles, que dão a aparência hexagonal.</span></header>
      <div className={styles.opcoes} role="group" aria-label="Escolher formato">
        {opcoes.map(item => <button key={item.id} type="button" aria-pressed={opcao === item.id} onClick={() => setOpcao(item.id)}><strong>{item.nome}</strong><span>{item.texto}</span></button>)}
      </div>
      <div className={styles.ferramentas}><div><strong>{escolhida.nome}</strong><p>{escolhida.texto}</p></div><div role="group" aria-label="Tamanho da prévia"><button type="button" aria-pressed={!celular} onClick={() => setCelular(false)}>Computador</button><button type="button" aria-pressed={celular} onClick={() => setCelular(true)}>Celular</button></div><a href={`/propostas/botoes/exemplo?opcao=${opcao}`} target="_blank" rel="noreferrer">Abrir em outra aba</a></div>
      <div className={styles.palco} data-celular={celular || undefined}><iframe key={opcao} title={`Prévia ${escolhida.nome}`} src={`/propostas/botoes/exemplo?opcao=${opcao}`} /></div>
      <p className={styles.nota}>E · Canto leve foi escolhido e está no Delta. As outras opções ficam disponíveis para comparação.</p>
      <details className={styles.historico}>
        <summary>Propostas anteriores A, B e C</summary>
        <p>Estas opções mudavam o desenho inteiro. Ficam guardadas para consulta.</p>
        <div className={styles.opcoes} role="group" aria-label="Propostas anteriores">
          {anteriores.map(item => <button key={item.id} type="button" aria-pressed={opcao === item.id} onClick={() => setOpcao(item.id)}><strong>{item.nome}</strong><span>{item.texto}</span></button>)}
        </div>
      </details>
    </main>
  );
}
