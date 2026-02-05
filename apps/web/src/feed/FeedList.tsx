const posts = [
  'Jovens produtores reduziram perdas em 30% com logística local.',
  'Nova bolsa para startups agrícolas em Angola.',
  'Dica: armazenar mandioca em local ventilado reduz perdas.'
];

export function FeedList() {
  return (
    <article className="card">
      <h2>Feed Inteligente</h2>
      <ul>
        {posts.map((post) => (
          <li key={post}>{post}</li>
        ))}
      </ul>
    </article>
  );
}
