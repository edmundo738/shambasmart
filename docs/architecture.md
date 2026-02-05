# Arquitetura CHAMBA / ShambaSmart

## Stack
- **Mobile**: React Native + Expo + TypeScript.
- **Web**: React + Vite + TypeScript (design minimalista e responsivo).
- **Backend**: Node.js + Express + TypeScript.
- **Dados**: PostgreSQL (produção) + Redis (fila/eventos e cache).
- **Offline-first**: SQLite/AsyncStorage no mobile e IndexedDB no web para fila de ações.

## Módulos de domínio
1. **Identity & Profiles**
2. **Dashboard & Alertas Inteligentes**
3. **Marketplace**
4. **Transporte & Logística**
5. **Feed Inteligente**
6. **Educação (Modo Estudante)**
7. **Gamificação & Reputação**
8. **Notificações**

## Fluxo de dados simplificado
1. Cliente carrega dados essenciais: clima, alertas, feed, preços.
2. Ações críticas (interesse em anúncio, pedido de transporte, comentário) são guardadas localmente.
3. Serviço de sincronização envia fila local quando a conexão volta.
4. API confirma persistência e retorna estado atualizado.

## Escalabilidade
- Multi-tenant por país/região.
- Particionamento por província para analytics.
- CDN para mídia e conteúdo educativo.
