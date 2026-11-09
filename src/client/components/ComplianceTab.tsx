import React, { useState, useEffect } from 'react';
import { Shield, Lock, FileText, CheckCircle2, AlertCircle, Ban } from 'lucide-react';

interface AuditEvent {
  id: number;
  actor_id: string;
  action: string;
  object_type: string;
  object_id: string;
  details_json?: any;
  occurred_at: string;
}

export const ComplianceTab: React.FC = () => {
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);

  useEffect(() => {
    fetch('/api/v1/admin/audit-logs')
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) setAuditEvents(data.events);
      });
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* India Compliance & Policy Checklist (Blueprint Chapter 11) */}
      <div className="panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <Shield size={22} color="var(--accent-gold)" />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
            Regulatory Compliance & Consent Architecture (TRAI & DPDP Act 2025)
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)', fontWeight: 600, marginBottom: '6px' }}>
              <CheckCircle2 size={16} /> Verifiable Permission First
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              Possession of a phone number is never treated as marketing permission. Only explicit, purpose-matched consent records can initiate an automated call.
            </p>
          </div>

          <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)', fontWeight: 600, marginBottom: '6px' }}>
              <CheckCircle2 size={16} /> Transparent AI Disclosure
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              Prompt Context Block 01 requires immediate self-identification as an AI assistant. Impersonation of human founders or agents is strictly disallowed.
            </p>
          </div>

          <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--danger)', fontWeight: 600, marginBottom: '6px' }}>
              <Ban size={16} /> Zero-Tolerance DNC Suppression
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              Whenever a recipient asks to stop calling, post-call webhook immediately updates suppression list and revokes consent before any queued campaign can retry.
            </p>
          </div>
        </div>
      </div>

      {/* Immutable Audit Trail */}
      <div className="panel" style={{ overflow: 'hidden' }}>
        <div className="panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} color="var(--accent-gold)" />
            <span style={{ fontWeight: 600 }}>System Audit Trail ({auditEvents.length} Events)</span>
          </div>
          <span className="badge badge-info">Auditable Ledger</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Timestamp</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Actor</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Action</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Target Object</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Metadata / Details</th>
              </tr>
            </thead>
            <tbody>
              {auditEvents.map((e) => (
                <tr key={e.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {new Date(e.occurred_at).toLocaleString()}
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'JetBrains Mono', fontSize: '13px' }}>{e.actor_id}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      className={`badge ${
                        e.action.includes('suppress') || e.action.includes('opt_out')
                          ? 'badge-danger'
                          : e.action.includes('dispatch')
                          ? 'badge-info'
                          : 'badge-success'
                      }`}
                    >
                      {e.action}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {e.object_type}: #{e.object_id}
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'JetBrains Mono', fontSize: '12px', color: 'var(--text-muted)' }}>
                    {e.details_json ? JSON.stringify(e.details_json) : '-'}
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
