import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api, ReadState, Session, segmentId } from './data';
import { Commands, Details, Directory, Trash } from './Records';
import { RecordDialog, type Action } from './dialogs';
import { SalesWorkspace } from './Sales';
import { Dashboard } from './Dashboard';
import { Data } from './DataView';
export function Workspace() {
  const [section, encoded] = useLocation().pathname.slice(1).split('/');
  const id = encoded && segmentId(encoded);
  const [version, setVersion] = useState<{ dataset: number; revision: number }>();
  const [epoch, setEpoch] = useState(0),
    [error, setError] = useState(''),
    [action, setAction] = useState<Action>();
  const refresh = useCallback(() => setEpoch((n) => n + 1), []);
  useEffect(() => {
    let live = true,
      sequence = 0;
    async function check() {
      const seq = ++sequence;
      try {
        const current = await api<{ dataset: number; revision: number }>('/version');
        if (live && seq === sequence) {
          setVersion(current);
          setError('');
        }
      } catch (e) {
        if (live && seq === sequence) setError((e as Error).message);
      }
    }
    check();
    window.addEventListener('focus', check);
    const timer = setInterval(check, 3000);
    return () => {
      live = false;
      window.removeEventListener('focus', check);
      clearInterval(timer);
    };
  }, []);
  if (!version)
    return (
      <>
        <h1>{section ? section.charAt(0).toUpperCase() + section.slice(1) : 'Dashboard'}</h1>
        <ReadState error={error} />
      </>
    );
  const kind = ['organizations', 'contacts', 'deals'].includes(section) ? section : '';
  return (
    <Session.Provider
      value={{ dataset: version.dataset, epoch: epoch + version.revision, refresh }}
    >
      <Commands.Provider value={(command) => setAction({ ...command, dataset: version.dataset })}>
        <div key={version.dataset} className="view">
          {section === 'pipeline' || (kind === 'deals' && id) ? (
            <SalesWorkspace id={id || ''} onBoard={section === 'pipeline'} />
          ) : kind ? (
            id ? (
              <Details kind={kind} id={id} />
            ) : (
              <Directory key={kind} kind={kind} />
            )
          ) : section === 'trash' ? (
            <Trash />
          ) : section === 'data' ? (
            <Data />
          ) : (
            <Dashboard />
          )}
        </div>
        {action && <RecordDialog action={action} close={() => setAction(undefined)} />}
      </Commands.Provider>
    </Session.Provider>
  );
}
