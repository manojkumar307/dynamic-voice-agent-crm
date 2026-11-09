import React, { useState } from 'react';
import { Database, Plus, RefreshCw, CheckCircle, Clock } from 'lucide-react';

interface Program {
  id: number;
  slug: string;
  title: string;
  status: string;
  description?: string;
  public_fee_inr?: number;
  is_public: boolean;
  next_session_date?: string;
  last_verified_at: string;
}

interface LiveDataProps {
  programs: Program[];
  onRefresh: () => void;
}

export const LiveDataTab: React.FC<LiveDataProps> = ({ programs, onRefresh }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editStatus, setEditStatus] = useState<string>('open');
  const [editFee, setEditFee] = useState<string>('');
  const [newProgram, setNewProgram] = useState({
    slug: '',
    title: '',
    status: 'contact_team',
    description: '',
    public_fee_inr: '',
    next_session_date: '',
  });

  const handleUpdate = async (program: Program) => {
    try {
      await fetch('/api/v1/admin/programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: program.slug,
          title: program.title,
          status: editStatus,
          public_fee_inr: editFee !== '' ? parseInt(editFee, 10) : program.public_fee_inr,
          is_public: true,
          next_session_date: program.next_session_date,
        }),
      });
      setEditingId(null);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/admin/programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProgram),
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewProgram({
          slug: '',
          title: '',
          status: 'contact_team',
          description: '',
          public_fee_inr: '',
          next_session_date: '',
        });
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Principle Callout */}
      <div
        className="panel"
        style={{
          padding: '18px 22px',
          background: 'rgba(212, 163, 115, 0.08)',
          borderLeft: '4px solid var(--accent-gold)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--accent-gold)', marginBottom: '4px' }}>
            Source of Truth Hierarchy: Zero-Hallucination Guardrail
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Never freeze dates, fees, or application status into static prompts. The AI voice agent queries these records in real-time via authenticated Custom API during live calls.
          </div>
        </div>

        <button className="btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={16} /> Add Program Fact
        </button>
      </div>

      {/* Program Inventory Table */}
      <div className="panel" style={{ overflow: 'hidden' }}>
        <div className="panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={18} color="var(--accent-gold)" />
            <span style={{ fontWeight: 600 }}>Live Product & Enrolment Facts</span>
          </div>
          <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={onRefresh}>
            <RefreshCw size={12} /> Refresh
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Slug & Title</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Enrolment Status</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Public Fee (INR)</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Next Session</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Last Verified</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {programs.map((p) => {
                const isEditing = editingId === p.id;
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600 }}>{p.title}</div>
                      <div style={{ fontFamily: 'JetBrains Mono', fontSize: '12px', color: 'var(--text-muted)' }}>
                        {p.slug}
                      </div>
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      {isEditing ? (
                        <select
                          className="input-field"
                          style={{ padding: '4px 8px', fontSize: '13px' }}
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value)}
                        >
                          <option value="open">Open</option>
                          <option value="contact_team">Contact Team</option>
                          <option value="waitlist">Waitlist</option>
                          <option value="closed">Closed</option>
                        </select>
                      ) : (
                        <span
                          className={`badge ${
                            p.status === 'open'
                              ? 'badge-success'
                              : p.status === 'waitlist'
                              ? 'badge-warning'
                              : 'badge-info'
                          }`}
                        >
                          {p.status}
                        </span>
                      )}
                    </td>

                    <td style={{ padding: '14px 16px', fontFamily: 'JetBrains Mono' }}>
                      {isEditing ? (
                        <input
                          className="input-field"
                          style={{ padding: '4px 8px', width: '100px', fontSize: '13px' }}
                          value={editFee}
                          onChange={(e) => setEditFee(e.target.value)}
                          placeholder="INR"
                        />
                      ) : p.public_fee_inr ? (
                        `₹${p.public_fee_inr.toLocaleString('en-IN')}`
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>Unlisted / Team Quote</span>
                      )}
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      {p.next_session_date || <span style={{ color: 'var(--text-muted)' }}>Rolling Enrolment</span>}
                    </td>

                    <td style={{ padding: '14px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                      <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} />
                      {new Date(p.last_verified_at).toLocaleDateString()}
                    </td>

                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      {isEditing ? (
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            className="btn-primary"
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                            onClick={() => handleUpdate(p)}
                          >
                            Save
                          </button>
                          <button
                            className="btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          className="btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '12px' }}
                          onClick={() => {
                            setEditingId(p.id);
                            setEditStatus(p.status);
                            setEditFee(p.public_fee_inr ? String(p.public_fee_inr) : '');
                          }}
                        >
                          Edit Facts
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Program Fact Modal */}
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
          <div className="panel" style={{ width: '460px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>Add Program Fact</h3>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Program Identifier (Slug)</label>
                <input
                  required
                  className="input-field"
                  value={newProgram.slug}
                  onChange={(e) => setNewProgram({ ...newProgram, slug: e.target.value })}
                  placeholder="e.g. founder-labs-fellowship"
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Display Title</label>
                <input
                  required
                  className="input-field"
                  value={newProgram.title}
                  onChange={(e) => setNewProgram({ ...newProgram, title: e.target.value })}
                  placeholder="e.g. Founder Labs Fellowship"
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Initial Enrolment Status</label>
                <select
                  className="input-field"
                  value={newProgram.status}
                  onChange={(e) => setNewProgram({ ...newProgram, status: e.target.value })}
                >
                  <option value="open">Open</option>
                  <option value="contact_team">Contact Team</option>
                  <option value="waitlist">Waitlist</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Public Fee in INR (Optional)</label>
                <input
                  type="number"
                  className="input-field"
                  value={newProgram.public_fee_inr}
                  onChange={(e) => setNewProgram({ ...newProgram, public_fee_inr: e.target.value })}
                  placeholder="e.g. 29999"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Fact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
