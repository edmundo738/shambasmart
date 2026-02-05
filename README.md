# CHAMBA / ShambaSmart

> **Onde o campo encontra oportunidades.**

MVP inicial de um super app AgroTech que conecta camponeses, compradores, transportadores, estudantes e investidores.

## ✅ O que já está organizado

- Monorepo com apps separados para **mobile**, **web** e **api**.
- Pacote **shared** para contratos e constantes comuns.
- Documentação em `docs/` para arquitetura, fluxo e modelo de dados.
- Base pronta para evolução em Angola → África → Mundo.

## Estrutura de pastas

```bash
.
├── apps
│   ├── api
│   ├── mobile
│   └── web
├── docs
└── packages
    └── shared
```

## Funcionalidades MVP incluídas

1. Dashboard agrícola com clima, alertas e dica diária.
2. Marketplace (produtos/insumos/serviços).
3. Logística com preço sugerido e reputação.
4. Perfil e reputação (base para evolução).
5. Modo estudante com cursos rápidos e medalhas.
6. Estrutura offline-first via endpoint de sincronização.

## Como executar

### 1) Instalar dependências do monorepo

```bash
npm install
```

### 2) Executar API

```bash
npm run dev:api
```

### 3) Executar Web

```bash
npm run dev:web
```

### 4) Executar Mobile (Expo)

```bash
npm run dev:mobile
```

## Próximos passos recomendados

- Persistir dados em PostgreSQL/MongoDB.
- Implementar autenticação por telefone/OTP.
- Adicionar fila offline real no web/mobile (IndexedDB/SQLite).
- Integrar notificações push inteligentes.
- Criar testes unitários/integrados para API e Web.
