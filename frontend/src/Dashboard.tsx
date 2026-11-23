import { useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { api, detailPath, money, ReadState, recordPath, Session, useRead, type Row } from './data';
import { colors, Stats, type Totals } from './Sales';
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip);
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
  const Component = revenue ? Line : Bar,
    name = revenue ? 'Won revenue' : 'Deals won';
  const labels = months.map((m) => m.month),
    values = months.map((m) => (revenue ? m.revenue / 100 : m.wins));
  return (
    <section className={'panel ' + (revenue ? 'revenue' : 'wins')}>
      <h2>{name}</h2>
      <div className="chart">
        <Component
          aria-label={name + ' by month'}
          data={{
            labels,
            datasets: [
              {
                label: name,
                data: values,
                backgroundColor: revenue ? '#06D6A0' : '#FFC145',
                borderColor: '#08735c',
                borderWidth: revenue ? 2 : 0,
              },
            ],
          }}
          options={{
            animation: false,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { title: { display: true, text: 'Close month' } },
              y: {
                beginAtZero: true,
                title: { display: true, text: revenue ? 'Revenue (USD)' : 'Number of wins' },
                ticks: { precision: 0 },
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
          Open pipeline →
        </Link>
      </header>
      {!report ? (
        <ReadState error={result?.error} />
      ) : (
        <>
          <Stats totals={report.totals} />
          <div className="dash-grid">
            <section className="panel funnel">
              <h2>Sales funnel</h2>
              <p className="muted">Current value of deals that reached each stage</p>
              <div className="funnel-rows">
                {Object.entries(report.funnel).map(([stage, v], i) => (
                  <div key={stage}>
                    <div className="funnel-key">
                      {stage}
                      <span className="numbers">{money(v)}</span>
                    </div>
                    <div className="funnel-track">
                      <div
                        className="funnel-fill"
                        style={{
                          width: (v / Math.max(1, ...Object.values(report.funnel))) * 100 + '%',
                          background: colors[i],
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
            <Chart months={report.months} revenue />
            <Chart months={report.months} />
            <section className="panel tasks">
              <h2>Follow-ups</h2>
              {error && <p role="alert">{error}</p>}
              {!report.followups.length && <p>No open follow-ups.</p>}
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
                          <div className="task-copy">
                            <strong>{t.description}</strong>
                            <Link to={detailPath(t.kind, t.owner_id)}>{t.owner}</Link>
                            <p>
                              {t.due} · <time>{t.follow_up}</time>
                            </p>
                          </div>
                          <button
                            className="check"
                            aria-label={'Mark done: ' + t.description}
                            onClick={() => complete(t.id)}
                          >
                            ✓
                          </button>
                        </article>
                      ))}
                    </section>
                  )
                );
              })}
            </section>
            <section className="panel activity">
              <h2>Recent activity</h2>
              {!report.recent.length && <p>No activity yet.</p>}
              {report.recent.map((a) => (
                <article key={a.id} className="activity-row">
                  <div className="activity-copy">
                    <strong>{a.description}</strong>
                    <Link to={detailPath(a.kind, a.owner_id)}>{a.owner}</Link> · {a.type}
                    <p>{new Date(a.occurred_at).toLocaleString()}</p>
                  </div>
                </article>
              ))}
            </section>
          </div>
        </>
      )}
    </>
  );
}
