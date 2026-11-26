import { Link, NavLink } from 'react-router-dom';
import {
  BriefcaseBusiness,
  Building2,
  ContactRound,
  Database,
  LayoutDashboard,
  SquareKanban,
  Trash2,
} from 'lucide-react';
import { Workspace } from './Workspace';
import { Auth, type Account } from './auth';
import { Search } from './Search';
import { Theme } from './theme';
import { UserMenu } from './UserMenu';
const sections = [
  { name: 'Dashboard', icon: LayoutDashboard },
  { name: 'Organizations', icon: Building2 },
  { name: 'Contacts', icon: ContactRound },
  { name: 'Deals', icon: BriefcaseBusiness },
  { name: 'Pipeline', icon: SquareKanban },
  { name: 'Trash', icon: Trash2 },
  { name: 'Data', icon: Database },
];
export function App() {
  return (
    <Auth>
      {(account) => (
        <Theme>
          <Shell account={account} />
        </Theme>
      )}
    </Auth>
  );
}

function Shell({ account }: { account: Account }) {
  const nav = ({ name, icon: Icon }: (typeof sections)[number]) => (
    <NavLink
      key={name}
      end={name === 'Dashboard'}
      to={name === 'Dashboard' ? '/' : '/' + name.toLowerCase()}
    >
      <Icon size={18} strokeWidth={1.75} aria-hidden="true" focusable="false" />
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
        <header className="top-bar">
          <Search />
          <UserMenu account={account} />
        </header>
        <Workspace />
      </main>
    </div>
  );
}
