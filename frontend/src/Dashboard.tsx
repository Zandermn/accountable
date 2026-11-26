import { useContext, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import {
  useApi,
  FollowUpDate,
  detailPath,
  money,
  ReadState,
  recordPath,
  Session,
  ShortDate,
  stages,
  useRead,
  type Row,
} from './data';
import { stageColors, Stats, type Totals } from './Sales';
import { ThemeMode } from './theme';
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip,
);
type Month = { month: string; wins: number; revenue: number };
type Item = Row & { owner: string; owner_id: string; due: string };
type Report = {
  months: Month[];
  totals: Totals;
  funnel: Record<string, number>;
  followups: Item[];
  recent: Item[];
};
function Chart({ months, revenue }: { months: Month[]; revenue?: boolean }) {
  // Read the active CSS colors on each theme change. Canvas cannot resolve CSS variables.
  useContext(ThemeMode);
  const root = getComputedStyle(document.documentElement);
  const color = (token: string) => root.getPropertyValue(token).trim();
  const series = color('--success-line');
  const tooltipText = color('--chart-tooltip-text');
  const Component = revenue ? Line : Bar,
    name = revenue ? 'Won revenue' : 'Deals won';
  const labels = months.map((m) =>
      new Date(m.month + '-01T12:00:00').toLocaleString('en-US', { month: 'short' }),
    ),
    values = months.map((m) => (revenue ? m.revenue / 100 : m.wins));
  const step = revenue
    ? Math.max(10000, Math.ceil(Math.max(...values) / 30000) * 10000)
    : Math.max(1, Math.ceil(Math.max(...values) / 3));
  const ticks = {
    color: color('--muted'),
    font: { family: '"JetBrains Mono", Consolas, monospace', size: 10 },
  };
  return (
    <section className={'panel ' + (revenue ? 'revenue' : 'wins')}>
      <div className="panel-head">
        <h2>{name}</h2>
        <small>Last 6 months</small>
      </div>
      <div className="chart">
        <Component
          aria-label={name + ' by month'}
          data={{
            labels,
            datasets: [
              {
                label: name,
                data: values,
                backgroundColor: color(revenue ? '--selected' : '--gold'),
                borderColor: series,
                pointBackgroundColor: series,
                borderWidth: revenue ? 2.5 : 0,
                fill: !!revenue,
                borderRadius: 5,
                barPercentage: 0.75,
              },
            ],
          }}
          options={{
            animation: false,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: color('--chart-tooltip'),
                titleColor: tooltipText,
                bodyColor: tooltipText,
                footerColor: tooltipText,
                multiKeyBackground: tooltipText,
              },
            },
            scales: {
              x: { offset: true, grid: { display: false }, border: { display: false }, ticks },
              y: {
                beginAtZero: true,
                max: step * 3,
                grid: { color: color('--line'), drawTicks: false },
                border: { display: false },
                ticks: {
                  ...ticks,
                  stepSize: step,
                  padding: 6,
                  callback: (v) => (revenue ? (v ? 'US$' + Number(v) / 1000 + 'k' : 'US$0') : v),
                },
              },
            },
          }}
        />
      </div>
      <details className="chart-values">
        <summary>Monthly values</summary>
        <ul>
          {months.map((m) => (
            <li key={m.month}>
              {m.month} · {revenue ? money(m.revenue) : m.wins}
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
export function Dashboard() {
  const api = useApi();
  const result = useRead<Report>('/dashboard'),
    report = result?.value;
  const { dataset, refresh } = useContext(Session),
    [error, setError] = useState('');
  async function complete(id: string) {
    try {
      await api(recordPath('activities', id), 'PATCH', { done: true }, dataset);
      setError('');
      refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <header className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p>Check deal movement and expected revenue</p>
        </div>
        <Link className="button" to="/pipeline">
          Open pipeline <span aria-hidden="true">→</span>
        </Link>
      </header>
      {!report ? (
        <ReadState error={result?.error} />
      ) : (
        <>
          <Stats totals={report.totals} />
          <div className="dash-grid">
            <section className="panel funnel">
              <div className="panel-head">
                <h2>Sales funnel</h2>
              </div>
              <p className="muted">Value of deals that reached each stage</p>
              <div className="funnel-rows">
                {Object.entries(report.funnel).map(([stage, v]) => (
                  <div key={stage}>
                    <div className="funnel-key">
                      {stage}
                      <span className="numbers">{money(v)}</span>
                    </div>
                    <div className="funnel-track">
                      <div
                        className="funnel-fill"
                        style={
                          {
                            '--size':
                              (v / Math.max(1, ...Object.values(report.funnel))) * 100 + '%',
                            '--stage': stageColors[stages.indexOf(stage)],
                          } as CSSProperties
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
            <Chart months={report.months} revenue />
            <Chart months={report.months} />
            <section className="panel tasks">
              <div className="panel-head">
                <h2>Follow-ups</h2>
                <small>{report.followups.length} open</small>
              </div>
              {error && <p role="alert">{error}</p>}
              {!report.followups.length && <p>No open follow-ups.</p>}
              <div className="task-groups">
                {['Overdue', 'Upcoming'].map((group) => {
                  const tasks = report.followups.filter(
                    (t) => (t.due === 'Overdue') === (group === 'Overdue'),
                  );
                  return (
                    !!tasks.length && (
                      <section key={group}>
                        <h3 className={'group-title ' + group.toLowerCase()}>{group}</h3>
                        {tasks.map((t) => (
                          <article className="task-row" key={t.id}>
                            <button
                              className="check"
                              aria-label={'Mark done: ' + t.description}
                              onClick={() => complete(t.id)}
                            />
                            <div className="task-copy">
                              <strong>{t.description}</strong>
                              <Link className="text-link" to={detailPath(t.kind, t.owner_id)}>
                                {t.owner}
                              </Link>
                            </div>
                            <span className="task-due">
                              {t.due === 'Due today' && 'Due today · '}
                              <FollowUpDate date={t.follow_up} zone={t.follow_up_zone} />
                            </span>
                          </article>
                        ))}
                      </section>
                    )
                  );
                })}
              </div>
            </section>
            <section className="panel activity">
              <div className="panel-head">
                <h2>Recent activity</h2>
              </div>
              {!report.recent.length && <p>No activity yet.</p>}
              {report.recent.slice(0, 3).map(activityRow)}
              {report.recent.length > 3 && (
                <details className="chart-values">
                  <summary>Show {report.recent.length - 3} more activities</summary>
                  {report.recent.slice(3).map(activityRow)}
                </details>
              )}
            </section>
          </div>
        </>
      )}
    </>
  );
}
function activityRow(a: Item) {
  return (
    <article key={a.id} className="activity-row">
      <span aria-hidden="true" className="activity-icon">
        {a.type === 'Stage' ? '↗' : a.type[0]}
      </span>
      <div className="activity-copy">
        <strong>
          {a.type !== 'Stage' && a.type + ' · '}
          {a.description}
        </strong>
        <Link className="text-link" to={detailPath(a.kind, a.owner_id)}>
          {a.owner}
        </Link>
        {a.added_by && (
          <>
            {' · '}
            <small>Added by {a.added_by}</small>
          </>
        )}
      </div>
      <ShortDate value={a.occurred_at} />
    </article>
  );
}
