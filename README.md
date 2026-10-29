# Delta

Template da Vitrine Virtual do Copiloto, desenvolvido com Next.js, React e TypeScript. Vitrine com composição diagonal, navegação em placas e catálogo por faixas de preço.

[Repositório da equipe](https://github.com/ocopiloto/copiloto-vitrine-delta) · [Catálogo de templates](https://github.com/ocopiloto/copiloto-vitrine-templates)

## Requisitos

- Node.js 24.
- npm, usando o `package-lock.json` deste projeto.
- Acesso à API do Copiloto para executar o modo integrado.

## Executar a demonstração

Na pasta do template:

```sh
npm ci
npm run dev:demo -- --port 3600
```

Abra `http://localhost:3600`. A demonstração usa um catálogo estático da Radial e bloqueia envios reais de leads e avaliações. Ela permite conferir as páginas e os componentes sem credenciais da API.

Para executar a demo com build de produção:

```sh
npm run build:demo
npm run start:demo -- --port 3601
```

## Configuração da loja

`site-config.json` reúne identidade, aparência, informações e seções da loja. As opções do painel são interpretadas pelo código existente do template. O estoque é consultado separadamente na API.

| Variável | Uso |
| --- | --- |
| `CLIENT_API_URL` | URL base da API do Copiloto |
| `CLIENT_API_TOKEN` | Chave de acesso usada apenas no servidor |
| `CLIENT_SLUG` | Identificador da loja |
| `SITE_CONFIG` | Configuração fornecida ao prebuild, quando aplicável |

Configure as variáveis pelo ambiente do servidor. Não inclua chaves no código, no `site-config.json`, em variáveis `NEXT_PUBLIC_*` ou no Git.

## Executar com a API

Com o ambiente da loja configurado:

```sh
npm run dev:integrated -- --port 3600
```

O modo integrado usa os endpoints e as Server Actions implementados no projeto. Configuração visual, estoque e recebimento de formulários devem ser verificados com o ambiente da loja. A demo não comprova essa integração.

## Estrutura

| Caminho | Responsabilidade |
| --- | --- |
| `src/app/` | Rotas públicas e preview do painel |
| `src/theme/` | Componentes, estilos e interações do tema |
| `src/lib/` | Dados, configuração, contratos e ações |
| `src/props.ts` | Interfaces entre as rotas e o tema |
| `public/` | Assets estáticos e mídia da demonstração |
| `scripts/` | Preparação da loja, execução e verificações |
| `site-config.json` | Configuração visual da loja |

As páginas incluem Início, Comprar, Veículo, Vender e Sobre nós. A rota `/preview` integra a apresentação ao painel do Copiloto.

## Validação

```sh
npm run lint
npx tsc --noEmit
npm run build:demo
```

Execute os comandos na pasta do template. Testes de navegador exigem o servidor em execução e as ferramentas de QA correspondentes. Validação com dados de demonstração ou API simulada não substitui homologação com a API real.

## Publicação

Para uma loja integrada, configure o ambiente e execute:

```sh
npm run build
npm start
```

`npm run build` executa o prebuild, que prepara mídia e reescreve `site-config.json`. Use esse comando no ambiente de build da loja. Para validar a demonstração, use `build:demo`.

O `vercel.json` deste projeto está configurado para a demo. Uma publicação integrada precisa do comando de build e das variáveis da loja. No repositório unificado, configure o diretório do projeto como `templates/delta`. Cadastro do tema no painel e configuração da hospedagem são etapas separadas.

## Créditos e licenças

Consulte [Créditos e licenças](THIRD_PARTY_NOTICES.md). As demonstrações usam mídia pública da Radial autorizada para esse contexto; substitua-a pela mídia da loja na implantação integrada.
