import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import './AdminPageShell.css';

type Breadcrumb = { label: string; to?: string };

type Props = {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumbs?: Breadcrumb[];
  children: ReactNode;
};

export default function AdminPageShell({ title, description, actions, breadcrumbs, children }: Props) {
  return (
    <main className="admin-main">
      <div className="admin-main__inner">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="admin-breadcrumbs" aria-label="Breadcrumb">
            <ol>
              {breadcrumbs.map((b, i) => (
                <li key={`${b.label}-${i}`}>
                  {b.to && i < breadcrumbs.length - 1 ? <Link to={b.to}>{b.label}</Link> : <span>{b.label}</span>}
                </li>
              ))}
            </ol>
          </nav>
        )}
        <header className="admin-page-header">
          <div className="admin-page-header__text">
            <h1>{title}</h1>
            {description ? <p>{description}</p> : null}
          </div>
          {actions ? <div className="admin-page-header__actions">{actions}</div> : null}
        </header>
        {children}
      </div>
    </main>
  );
}
