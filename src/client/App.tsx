import React, { useState, useEffect } from 'react';
import {
  PhoneCall,
  Cpu,
  Database,
  BarChart3,
  ShieldCheck,
  FlaskConical,
  Radio,
  ExternalLink,
} from 'lucide-react';
import { CallControlTab } from './components/CallControlTab.js';
import { AgentConfigTab } from './components/AgentConfigTab.js';
import { LiveDataTab } from './components/LiveDataTab.js';
import { CallsOutcomesTab } from './components/CallsOutcomesTab.js';
import { ComplianceTab } from './components/ComplianceTab.js';
import { QaLabTab } from './components/QaLabTab.js';

type TabType = 'calls' | 'agent' | 'live-data' | 'outcomes' | 'compliance' | 'qa-lab';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('calls');
  const [overview, setOverview] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);

  const loadData = async () => {
    try {
      const [overRes, contRes, progRes] = await Promise.all([
        fetch('/api/v1/admin/overview'),
        fetch('/api/v1/admin/contacts'),
        fetch('/api/v1/admin/programs'),
      ]);

      const overData = await overRes.json();
      const contData = await contRes.json();
      const progData = await progRes.json();

      if (overData.ok) setOverview(overData);
      if (contData.ok) setContacts(contData.contacts);
      if (progData.ok) setPrograms(progData.programs);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navigation Bar */}
      <header
        style={{
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--bg-secondary)',
          padding: '14px 28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #d4a373 0%, #a46d3b 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              color: '#0a0d14',
              fontSize: '16px',
            }}
          >
            FL
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '16px', letterSpacing: '-0.02em' }}>
              Founder Labs <span style={{ color: 'var(--accent-gold)' }}>Voice Concierge</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Dynamic AI Calling & CRM Integration Blueprint
            </div>
          </div>
        </div>

        {/* Status Indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: 'var(--success)',
                display: 'inline-block',
              }}
              className="animate-pulse-glow"
            />
            <span style={{ fontSize: '13px', fontWeight: 600 }}>API Connected</span>
          </div>

          <div
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontFamily: 'JetBrains Mono',
              color: 'var(--accent-blue)',
            }}
          >
            OmniDimension v1
          </div>
        </div>
      </header>

      {/* Main Metric Ribbon */}
      <section
        style={{
          background: 'var(--bg-primary)',
          borderBottom: '1px solid var(--border-color)',
          padding: '16px 28px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>PERMITTED CONTACTS</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
            {overview?.stats?.permittedContacts ?? 0}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>COMPLETED CALLS</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--accent-gold)', marginTop: '2px' }}>
            {overview?.stats?.completedCalls ?? 0}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>HIGH INTEREST RATE</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--success)', marginTop: '2px' }}>
            {overview?.stats?.highInterest ?? 0}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>CALLBACKS PENDING</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--accent-blue)', marginTop: '2px' }}>
            {overview?.stats?.callbacksPending ?? 0}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>DNC SUPPRESSIONS</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--danger)', marginTop: '2px' }}>
            {overview?.stats?.suppressedContacts ?? 0}
          </div>
        </div>
      </section>

      {/* Sub-Navigation Tabs */}
      <nav
        style={{
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-color)',
          padding: '0 28px',
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
        }}
      >
        {[
          { key: 'calls', label: 'Call Control', icon: PhoneCall },
          { key: 'agent', label: 'Agent Configuration', icon: Cpu },
          { key: 'live-data', label: 'Live Program Facts', icon: Database },
          { key: 'outcomes', label: 'Calls & Outcomes', icon: BarChart3 },
          { key: 'compliance', label: 'Compliance & DNC', icon: ShieldCheck },
          { key: 'qa-lab', label: 'QA Lab (Release Gates)', icon: FlaskConical },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabType)}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--accent-gold)' : '2px solid transparent',
                color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
                fontWeight: isActive ? 600 : 500,
                padding: '12px 16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={16} color={isActive ? 'var(--accent-gold)' : 'var(--text-muted)'} />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Content Container */}
      <main style={{ flex: 1, padding: '28px', maxWidth: '1400px', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        {activeTab === 'calls' && (
          <CallControlTab contacts={contacts} stats={overview?.stats} onRefresh={loadData} />
        )}
        {activeTab === 'agent' && <AgentConfigTab />}
        {activeTab === 'live-data' && <LiveDataTab programs={programs} onRefresh={loadData} />}
        {activeTab === 'outcomes' && <CallsOutcomesTab />}
        {activeTab === 'compliance' && <ComplianceTab />}
        {activeTab === 'qa-lab' && <QaLabTab />}
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--border-color)',
          padding: '16px 28px',
          textAlign: 'center',
          fontSize: '12px',
          color: 'var(--text-muted)',
          background: 'var(--bg-secondary)',
        }}
      >
        Dynamic Voice Agent & CRM Architecture | Clean-Room Implementation adhering to Engineering Standards
      </footer>
    </div>
  );
}
