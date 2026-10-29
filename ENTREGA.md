# Entrega do Delta à equipe Copiloto

Entrega em 28/10/2026, a pedido de Igor, no repositório individual indicado pelo Luan. O código, a configuração, os arquivos de dependências e os protótipos versionados foram preservados. O histórico anterior continua neste repositório.

## Executar a demonstração

Use Node.js 24 e npm. Na raiz deste projeto:

```sh
npm ci
npm run dev:demo -- --port 3600
```

A demonstração usa a amostra estática da Radial e bloqueia submissões reais. Para conferir código e gerar a demo: `npm run lint`, `npx tsc --noEmit` e `npm run build:demo`.

## Configuração e integração

O projeto usa `site-config.json`. O prebuild também aceita `SITE_CONFIG`, reescreve o JSON e prepara mídia. O estoque é separado da configuração e usa `CLIENT_API_URL`, `CLIENT_API_TOKEN` e `CLIENT_SLUG`, somente no servidor.

A base de contrato registrada é Horizon de 26/10/2026. Esta entrega organiza o código existente; não inclui um novo porte de contrato, cadastro de tema no painel ou homologação autenticada. Consulte o README e os relatórios em `docs/` para as verificações anteriores e as pendências de cada versão.

## Publicação e manutenção

O `vercel.json` existente configura a demo. Para uma loja integrada, a equipe precisa configurar o build e o ambiente da loja. `npm run build` executa o prebuild mutável; não o use como conferência inocente.

As demos pessoais continuam vinculadas aos repositórios de Igor. Nenhum vínculo de hospedagem foi transferido nesta entrega. Push neste repositório da organização não foi configurado por esta sessão para publicar essas demos.

O agrupamento dos seis temas fica em [ocopiloto/copiloto-vitrine-templates](https://github.com/ocopiloto/copiloto-vitrine-templates). Cada tema mantém seu pacote e lockfile próprios. Não há sincronização automática entre o agrupamento e os repositórios individuais.

## Revisão de 28/10/2026

Inclui header reorganizado, paleta clara, prévia de até dois carros por categoria, avaliações em loop e os botões E, Canto leve. As opções de categorias permanecem disponíveis e aguardam escolha. A entrega passou novamente em ESLint e TypeScript; os resultados visuais anteriores estão em `docs/revisao-2026-10-28.md`. Não houve publicação da demo do Delta na hospedagem.
