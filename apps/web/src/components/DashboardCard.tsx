export function DashboardCard() {
  return (
    <article className="card">
      <h2>Dashboard agrícola</h2>
      <ul>
        <li>📍 Huambo</li>
        <li>🌦️ 28ºC, chuva leve prevista</li>
        <li>🛣️ Estradas: moderado</li>
        <li>💡 Dica: irrigar ao fim da tarde</li>
      </ul>
      <div className="chips">
        <span className="chip danger">Alerta de chuva forte</span>
        <span className="chip info">Preço do milho em alta</span>
      </div>
    </article>
  );
}
