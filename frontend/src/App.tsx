import { Link, NavLink } from 'react-router-dom';
import { Workspace } from './Workspace';
export const sections = [
  'Dashboard',
  'Organizations',
  'Contacts',
  'Deals',
  'Pipeline',
  'Trash',
  'Data',
];
export function App() {
  const nav = (name: string) => (
    <NavLink
      key={name}
      end={name === 'Dashboard'}
      to={name === 'Dashboard' ? '/' : '/' + name.toLowerCase()}
    >
      <i
        className={name === 'Contacts' ? 'round' : name === 'Pipeline' ? 'board' : undefined}
        aria-hidden="true"
      />
      {name}
    </NavLink>
  );
  return (
    <div className="shell">
      <aside className="rail">
        <div className="rail-inner">
          <Link to="/" className="brand">
            <span className="brand-mark" />
            Accountable
          </Link>
          <nav className="menu" aria-label="Main sections">
            {sections.slice(0, 5).map(nav)}
          </nav>
          <nav className="menu" aria-label="Utilities">
            {sections.slice(5).map(nav)}
          </nav>
        </div>
      </aside>
      <main>
        <Workspace />
      </main>
    </div>
  );
}
