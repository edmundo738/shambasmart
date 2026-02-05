# Modelo de dados simplificado

## Entidades principais
- `User(id, role, name, location, rating)`
- `Listing(id, ownerId, category, title, price, location, status)`
- `TransportOffer(id, transporterId, route, capacity, priceSuggestion, rating)`
- `Course(id, title, durationMinutes, badge)`
- `OfflineAction(id, userId, type, payload, createdAt, syncedAt)`

## Índices recomendados
- `Listing(category, location, status)`
- `TransportOffer(route, rating)`
- `OfflineAction(userId, syncedAt)`
