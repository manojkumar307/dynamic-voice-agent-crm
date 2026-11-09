import React, { useState } from 'react';
import { PhoneCall, UserPlus, ShieldAlert, CheckCircle2, AlertOctagon, Loader2, Play } from 'lucide-react';

interface Contact {
  id: number;
  first_name: string;
  phone_e164: string;
  email?: string;
  segment: string;
  language: string;
  is_suppressed: boolean;
}

interface CallControlProps {
  contacts: Contact[];
  stats: any;
  onRefresh: () => void;
}

export const CallControlTab: React.FC<CallControlProps> = ({ contacts, stats, onRefresh }) => {
  const [callingId, setCallingId] = useState<number | null>(null);
  const [dispatchResult, setDispatchResult] = useState<any>(null);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newContact, setNewContact] = useState({
    first_name: '',
    phone_e164: '',
    email: '',
    segment: 'working_professional',
    language: 'English',
  });

  const handleCall = async (contactId: number) => {
    if (isPaused) {
      alert('Outbound calling is currently PAUSED.');
      return;
    }
    setCallingId(contactId);
    setDispatchResult(null);

    try {
      const res = await fetch('/api/v1/voice/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_id: contactId,
          reason_for_call: 'Follow up on Founder Labs program inquiry',
        }),
      });

      const data = await res.json();
      setDispatchResult({ contactId, ...data });
      onRefresh();
    } catch (err: any) {
      setDispatchResult({ contactId, ok: false, error: err.message });
    } finally {
      setCallingId(null);
    }
  };

  const handleToggleSuppression = async (contactId: number) => {
    try {
      await fetch(`/api/v1/admin/contacts/${contactId}/toggle-suppression`, {
        method: 'POST',
      });
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/admin/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newContact),
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewContact({
          first_name: '',
          phone_e164: '',
          email: '',
          segment: 'working_professional',
          language: 'English',
        });
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner & Control Actions */}
      <div
        className="panel"
        style={{
          padding: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: isPaused
            ? 'linear-gradient(90deg, rgba(239, 68, 68, 0.15) 0%, rgba(22, 30, 49, 1) 100%)'
            : 'linear-gradient(90deg, rgba(212, 163, 115, 0.1) 0%, rgba(22, 30, 49, 1) 100%)',
        }}
      >
        <div>
          <h2 style={{ margin: '0 0 6px 0', fontSize: '20px', fontWeight: '700' }}>
            Outbound Dispatch & Call Control
          </h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px' }}>
            Enforces strict consent verification, L1 data minimisation, and real-time provider correlation.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setIsPaused(!isPaused)}
            style={{
              background: isPaused ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
              border: `1px solid ${isPaused ? '#ef4444' : '#f59e0b'}`,
              color: isPaused ? '#fca5a5' : '#fcd34d',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 600,
            }}
          >
            <AlertOctagon size={16} />
            {isPaused ? 'Resume Calling Queue' : 'Pause All Outbound'}
          </button>

          <button className="btn-primary" onClick={() => setShowAddModal(true)}>
            <UserPlus size={16} />
            Add Permitted Contact
          </button>
        </div>
      </div>

      {/* Dispatch feedback toast */}
      {dispatchResult && (
        <div
          className="panel"
          style={{
            padding: '14px 18px',
            borderColor: dispatchResult.ok ? 'var(--success)' : 'var(--danger)',
            background: dispatchResult.ok ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {dispatchResult.ok ? (
              <CheckCircle2 color="var(--success)" size={20} />
            ) : (
              <ShieldAlert color="var(--danger)" size={20} />
            )}
            <div>
              <span style={{ fontWeight: 600 }}>
                {dispatchResult.ok ? 'Call Dispatched Successfully' : 'Dispatch Rejected / Blocked'}
              </span>
              <span style={{ marginLeft: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
                {dispatchResult.ok
                  ? `Attempt ID: #${dispatchResult.attempt_id} | Request: ${dispatchResult.request_id} | Context: ${dispatchResult.context_ref}`
                  : `Reason: ${dispatchResult.message || dispatchResult.reason || dispatchResult.error}`}
              </span>
            </div>
          </div>
          <button
            onClick={() => setDispatchResult(null)}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Permitted Contacts Table */}
      <div className="panel" style={{ overflow: 'hidden' }}>
        <div className="panel-header">
          <span style={{ fontWeight: 600 }}>Permitted Audience & Calling Register</span>
          <span className="badge badge-info">{contacts.length} Total Contacts</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Contact</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Phone (E.164)</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Segment</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Language</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Consent Status</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr
                  key={contact.id}
                  style={{
                    borderBottom: '1px solid var(--border-color)',
                    background: contact.is_suppressed ? 'rgba(239, 68, 68, 0.04)' : undefined,
                  }}
                >
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600 }}>{contact.first_name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{contact.email || 'No email'}</div>
                  </td>
                  <td style={{ padding: '14px 16px', fontFamily: 'JetBrains Mono' }}>{contact.phone_e164}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ textTransform: 'capitalize' }}>{contact.segment.replace('_', ' ')}</span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>{contact.language}</td>
                  <td style={{ padding: '14px 16px' }}>
                    {contact.is_suppressed ? (
                      <span className="badge badge-danger">Suppressed (DNC)</span>
                    ) : (
                      <span className="badge badge-success">Consented</span>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '8px' }}>
                      <button
                        onClick={() => handleToggleSuppression(contact.id)}
                        className="btn-secondary"
                        style={{ padding: '6px 10px', fontSize: '12px' }}
                      >
                        {contact.is_suppressed ? 'Unsuppress' : 'Mark DNC'}
                      </button>

                      <button
                        disabled={contact.is_suppressed || callingId === contact.id}
                        onClick={() => handleCall(contact.id)}
                        className="btn-primary"
                        style={{
                          padding: '6px 12px',
                          fontSize: '12px',
                          opacity: contact.is_suppressed ? 0.4 : 1,
                          cursor: contact.is_suppressed ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {callingId === contact.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Play size={14} />
                        )}
                        Call Now
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Contact Modal */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
        >
          <div className="panel" style={{ width: '440px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>Add Consented Contact</h3>
            <form onSubmit={handleCreateContact} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-muted)' }}>First Name</label>
                <input
                  required
                  className="input-field"
                  value={newContact.first_name}
                  onChange={(e) => setNewContact({ ...newContact, first_name: e.target.value })}
                  placeholder="e.g. Aarav"
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Phone Number (E.164 with country code)</label>
                <input
                  required
                  className="input-field"
                  value={newContact.phone_e164}
                  onChange={(e) => setNewContact({ ...newContact, phone_e164: e.target.value })}
                  placeholder="e.g. +919876543210"
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Email (Optional)</label>
                <input
                  type="email"
                  className="input-field"
                  value={newContact.email}
                  onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                  placeholder="e.g. founder@example.com"
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Segment</label>
                <select
                  className="input-field"
                  value={newContact.segment}
                  onChange={(e) => setNewContact({ ...newContact, segment: e.target.value })}
                >
                  <option value="working_professional">Working Professional</option>
                  <option value="founder">Founder / Entrepreneur</option>
                  <option value="student">Student / Early Career</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save & Grant Consent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
