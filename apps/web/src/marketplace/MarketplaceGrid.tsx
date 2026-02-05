const listings = [
  { title: 'Milho 50kg', price: '18.000 Kz', place: 'Huambo' },
  { title: 'Tomate fresco', price: '12.500 Kz', place: 'Bié' },
  { title: 'Serviço de colheita', price: '9.000 Kz', place: 'Benguela' }
];

export function MarketplaceGrid() {
  return (
    <article className="card">
      <h2>Marketplace</h2>
      {listings.map((item) => (
        <div className="row" key={item.title}>
          <div>
            <strong>{item.title}</strong>
            <p>{item.place}</p>
          </div>
          <div>
            <p>{item.price}</p>
            <button>Tenho interesse</button>
          </div>
        </div>
      ))}
    </article>
  );
}
