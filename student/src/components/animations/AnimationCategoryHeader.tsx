import { Link } from 'react-router-dom';
import { animationCategories } from './catalog';

export function AnimationCategoryHeader({ domain, count, loading }: {
  domain: typeof animationCategories[number]; count: number; loading: boolean;
}) {
  const sql = domain.id === 'DATABASE';
  return <>
    <nav aria-label="Breadcrumb" className="animation-category-breadcrumb"><Link to="/animations">Animations</Link><span aria-hidden="true">→</span><span aria-current="page">{domain.title}</span></nav>
    <header className="animation-category-header">
      <div className="animation-category-heading"><domain.icon size={26} aria-hidden="true" /><div>
        <h1 className="text-xl md:text-2xl font-bold text-text-primary">{domain.title}</h1>
        <p>{sql ? 'Visualize how SQL queries, joins, indexes, transactions, and database concepts work. Learn step by step with interactive animations.' : domain.description}</p>
      </div></div>
      <aside className="animation-category-summary" aria-label={`${domain.title} summary`}>
        <strong>{loading ? '…' : count} <span>{sql ? 'SQL animations' : 'animations'}</span></strong>
        <p>{sql ? 'Interactive visualizations for SQL and database concepts.' : `Interactive visualizations for ${domain.title}.`}</p>
      </aside>
    </header>
  </>;
}
