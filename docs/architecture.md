# Arquitetura do MVP CHAMBA / ShambaSmart

## Stack
- **Mobile:** React Native (Expo)
- **Web:** React + Vite
- **API:** Node.js + Express
- **Shared:** contratos e constantes reutilizáveis

## Organização
- `apps/mobile` → cliente mobile focado em usabilidade offline.
- `apps/web` → painel web responsivo com os módulos principais do MVP.
- `apps/api` → endpoints de dashboard, feed, marketplace, logística e cursos.
- `packages/shared` → papéis de utilizador e tipos de ações offline.

## Fluxo offline-first
1. Utilizador interage no marketplace ou logística.
2. Ação é guardada em fila local (cliente).
3. Ao reconectar, cliente chama `POST /api/sync/offline-actions`.
4. API confirma quantas ações foram sincronizadas.
