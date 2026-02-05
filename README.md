# CHAMBA / ShambaSmart MVP

"Onde o campo encontra oportunidades".

Monorepo base com:
- `apps/mobile`: React Native (Expo) para agricultores, compradores e transportadores.
- `apps/web`: React + Vite para experiência web responsiva.
- `apps/api`: Node.js + Express para API do MVP.
- `packages/shared`: tipos e contratos compartilhados.
- `docs`: arquitetura, fluxo de utilizador e esquema de dados.

## Funcionalidades MVP cobertas
- Dashboard agrícola (clima, alertas, trânsito/estradas, dica diária).
- Feed inteligente com notícias, histórias e anúncios úteis.
- Marketplace (produtos, insumos e serviços).
- Logística/transporte com correspondência produtor ↔ transportador.
- Perfil do camponês com reputação e histórico.
- Modo estudante com micro-cursos e medalhas.
- Offline-first (fila local + sincronização quando reconecta).
- Notificações inteligentes orientadas a utilidade.

## Executável rápido
Para iniciar a API com um único comando, use o executável na raiz do projeto:

```bash
./shambasmart
```

Opções:
- `--dev`: inicia em modo desenvolvimento (`tsx watch`).
- `--help`: mostra ajuda.

> Antes do primeiro uso, instale as dependências da API:
> `cd apps/api && npm install`

## Arranque rápido (desenvolvimento)
```bash
# API
cd apps/api && npm install && npm run dev

# Web
cd apps/web && npm install && npm run dev

# Mobile (Expo)
cd apps/mobile && npm install && npm run start
```
