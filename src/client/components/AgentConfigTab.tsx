import React, { useState, useEffect } from 'react';
import { Cpu, Terminal, Key, ShieldCheck, Copy, Check } from 'lucide-react';

export const AgentConfigTab: React.FC = () => {
  const [promptData, setPromptData] = useState<any>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/v1/admin/prompt-config')
      .then((res) => res.json())
      .then((data) => setPromptData(data));
  }, []);

  const handleCopy = (text: string, title: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(title);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Platform & Telephony Details */}
      <div className="panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <Cpu color="var(--accent-gold)" size={24} />
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>
              OmniDimension Telephony & Orchestration Configuration
            </h3>
            <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '13px' }}>
              Voice turn-taking, transcription, and tool execution managed by OmniDimension; business logic and truth retained on backend.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          <div style={{ background: 'var(--bg-secondary)', padding: '12px 16px', borderRadius: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Provider API Base</span>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '14px', marginTop: '4px' }}>
              https://omnidim.io/api/v1
            </div>
          </div>

          <div style={{ background: 'var(--bg-secondary)', padding: '12px 16px', borderRadius: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Agent System Name</span>
            <div style={{ fontSize: '14px', fontWeight: 600, marginTop: '4px' }}>
              {promptData?.config?.conciergeTitle || 'Founder Labs | Dynamic Voice Concierge'}
            </div>
          </div>

          <div style={{ background: 'var(--bg-secondary)', padding: '12px 16px', borderRadius: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Timezone & Region</span>
            <div style={{ fontSize: '14px', marginTop: '4px' }}>
              {promptData?.config?.defaultTimezone || 'Asia/Kolkata'} (IST)
            </div>
          </div>

          <div style={{ background: 'var(--bg-secondary)', padding: '12px 16px', borderRadius: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Tool Security Header</span>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '14px', marginTop: '4px', color: 'var(--accent-blue)' }}>
              X-Voice-Tool-Token
            </div>
          </div>
        </div>
      </div>

      {/* Copy-Ready Context Breakdown Sections */}
      <div className="panel">
        <div className="panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Terminal size={18} color="var(--accent-gold)" />
            <span style={{ fontWeight: 600 }}>Modular Agent System Prompt Sections (Chapter 08)</span>
          </div>
          <span className="badge badge-info">5 Structured Context Blocks</span>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {promptData?.breakdown?.map((section: any, idx: number) => (
            <div
              key={idx}
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '16px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--accent-gold)' }}>
                  {section.title}
                </span>
                <button
                  className="btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '12px' }}
                  onClick={() => handleCopy(section.body, section.title)}
                >
                  {copiedSection === section.title ? (
                    <>
                      <Check size={12} color="var(--success)" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy size={12} /> Copy Prompt
                    </>
                  )}
                </button>
              </div>

              <pre
                style={{
                  margin: 0,
                  fontSize: '13px',
                  lineHeight: '1.5',
                  color: 'var(--text-main)',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'JetBrains Mono',
                  background: 'rgba(0,0,0,0.2)',
                  padding: '12px',
                  borderRadius: '6px',
                }}
              >
                {section.body}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
