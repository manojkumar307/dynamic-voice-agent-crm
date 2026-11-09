import React, { useState, useEffect } from 'react';
import { PhoneForwarded, RefreshCcw, CheckCircle, AlertTriangle, Calendar, MessageSquare } from 'lucide-react';

interface CallOutcome {
  id: number;
  call_log_id: string;
  summary?: string;
  interest_level: string;
  interested_program?: string;
  callback_requested: boolean;
  callback_datetime?: string;
  do_not_call: boolean;
  handoff_needed: boolean;
  created_at: string;
}

interface CallAttempt {
  id: number;
  contact_id: number;
  contact_name?: string;
  phone?: string;
  request_id?: string;
  status: string;
  created_at: string;
}

export const CallsOutcomesTab: React.FC = () => {
  const [attempts, setAttempts] = useState<CallAttempt[]>([]);
  const [outcomes, setOutcomes] = useState<CallOutcome[]>([]);
  const [isReconciling, setIsReconciling] = useState(false);
  const [reconcileReport, setReconcileReport] = useState<any>(null);

  const fetchData = async () => {
    try {
      const [attRes, outRes] = await Promise.all([
        fetch('/api/v1/admin/call-attempts'),
        fetch('/api/v1/admin/outcomes'),
      ]);
      const attData = await attRes.json();
      const outData = await outRes.json();
      if (attData.ok) setAttempts(attData.attempts);
      if (outData.ok) setOutcomes(outData.outcomes);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleReconcile = async () => {
    setIsReconciling(true);
    setReconcileReport(null);
    try {
      const res = await fetch('/api/v1/admin/reconcile', { method: 'POST' });
      const data = await res.json();
      setReconcileReport(data.report);
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsReconciling(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Reconciliation Action Bar */}
      <div
        className="panel"
        style={{
          padding: '18px 22px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-secondary)',
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
            Post-Call Intelligence & Provider Reconciliation (Chapter 07 & 08)
          </h3>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '13px' }}>
            Idempotent webhook ingestion maps conversation results into structured CRM fields. Reconciliation repairs missed webhooks without redialing.
          </p>
        </div>

        <button
          className="btn-secondary"
          onClick={handleReconcile}
          disabled={isReconciling}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <RefreshCcw size={14} className={isReconciling ? 'animate-spin' : ''} />
          {isReconciling ? 'Reconciling...' : 'Run In-Flight Reconciliation'}
        </button>
      </div>

      {reconcileReport && (
        <div className="panel" style={{ padding: '14px 18px', background: 'rgba(56, 189, 248, 0.1)', borderColor: 'var(--accent-blue)' }}>
          <span style={{ fontWeight: 600, color: 'var(--accent-blue)' }}>Reconciliation Completed:</span>
          <span style={{ marginLeft: '10px', fontSize: '13px' }}>
            Checked: {reconcileReport.checkedCount} calls | Reconciled: {reconcileReport.reconciledCount} missing outcomes.
          </span>
        </div>
      )}

      {/* Structured Outcomes Grid */}
      <div className="panel">
        <div className="panel-header">
          <span style={{ fontWeight: 600 }}>Extracted Post-Call Outcomes ({outcomes.length})</span>
          <span className="badge badge-info">L3 Structured Intelligence</span>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {outcomes.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No call outcomes recorded yet. Dispatched calls will post structured results here automatically.
            </div>
          ) : (
            outcomes.map((o) => (
              <div
                key={o.id}
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '16px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MessageSquare size={16} color="var(--accent-gold)" />
                    <span style={{ fontWeight: 600, fontSize: '14px' }}>
                      Call Log: <span style={{ fontFamily: 'JetBrains Mono', color: 'var(--text-muted)' }}>{o.call_log_id}</span>
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <span
                      className={`badge ${
                        o.interest_level === 'high'
                          ? 'badge-success'
                          : o.interest_level === 'medium'
                          ? 'badge-info'
                          : 'badge-warning'
                      }`}
                    >
                      Interest: {o.interest_level.toUpperCase()}
                    </span>

                    {o.do_not_call && <span className="badge badge-danger">OPT-OUT REQUESTED</span>}
                    {o.callback_requested && <span className="badge badge-warning">CALLBACK WANTED</span>}
                    {o.handoff_needed && <span className="badge badge-danger">STAFF HANDOFF</span>}
                  </div>
                </div>

                {o.summary && (
                  <p style={{ margin: '8px 0 12px 0', fontSize: '14px', color: 'var(--text-main)', lineHeight: '1.5' }}>
                    {o.summary}
                  </p>
                )}

                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '16px',
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                    borderTop: '1px solid var(--border-color)',
                    paddingTop: '10px',
                  }}
                >
                  {o.interested_program && (
                    <div>
                      <strong>Target Program:</strong> {o.interested_program}
                    </div>
                  )}

                  {o.callback_datetime && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={12} />
                      <strong>Callback Time:</strong> {new Date(o.callback_datetime).toLocaleString()}
                    </div>
                  )}

                  <div style={{ marginLeft: 'auto' }}>
                    <strong>Recorded:</strong> {new Date(o.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Dispatched Call Attempts Table */}
      <div className="panel" style={{ overflow: 'hidden' }}>
        <div className="panel-header">
          <span style={{ fontWeight: 600 }}>Call Attempts & Provider Correlation Register</span>
          <span className="badge badge-info">{attempts.length} Total Attempts</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Attempt #</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Contact</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Provider Request ID</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Dispatched At</th>
              </tr>
            </thead>
            <tbody>
              {attempts.map((att) => (
                <tr key={att.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>#{att.id}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div>{att.contact_name || `Contact #${att.contact_id}`}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                      {att.phone}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'JetBrains Mono', fontSize: '13px' }}>
                    {att.request_id || <span style={{ color: 'var(--text-muted)' }}>Pending Dispatch</span>}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      className={`badge ${
                        att.status === 'completed'
                          ? 'badge-success'
                          : att.status === 'dispatched'
                          ? 'badge-info'
                          : 'badge-warning'
                      }`}
                    >
                      {att.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    {new Date(att.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
