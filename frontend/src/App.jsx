import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import './index.css';

// Initialize socket outside component to prevent multiple connections
const socket = io('http://localhost:5001');

function App() {
  const [query, setQuery] = useState('');
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [status, setStatus] = useState('');
  const [activeTab, setActiveTab] = useState('agent'); // 'agent', 'saved', or 'about'
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authType, setAuthType] = useState('login'); // 'login' or 'signup'
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('clientflow_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [savedLeads, setSavedLeads] = useState(() => {
    const saved = localStorage.getItem('clientflow_saved_leads');
    return saved ? JSON.parse(saved) : [];
  });
  
  useEffect(() => {
    localStorage.setItem('clientflow_saved_leads', JSON.stringify(savedLeads));
  }, [savedLeads]);

  useEffect(() => {
    socket.on('connect', () => {
      console.log('Connected to ClientFlow Backend');
    });

    socket.on('search_started', (data) => {
      setLeads([]);
      setLoading(true);
      setSearched(true);
      setStatus(`Searching for ${data.query}...`);
    });

    socket.on('new_lead', (lead) => {
      setLeads((prev) => [...prev, lead]);
    });

    socket.on('search_completed', () => {
      setLoading(false);
      setStatus('Search completed.');
    });

    socket.on('error', (err) => {
      console.error('Socket error:', err);
      setLoading(false);
      setStatus(`Error: ${err}`);
    });

    return () => {
      socket.off('search_started');
      socket.off('new_lead');
      socket.off('search_completed');
      socket.off('error');
    };
  }, []);

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    if (!query) return;

    setActiveTab('agent');
    setSearched(true);
    setLoading(true);
    setLeads([]);
    setStatus('Initializing search...');
    
    socket.emit('search_init', { query });
  };

  const handleAuthSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const name = formData.get('name') || email.split('@')[0];
    
    const userData = { email, name };
    setUser(userData);
    localStorage.setItem('clientflow_user', JSON.stringify(userData));
    setShowAuthModal(false);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('clientflow_user');
  };

  const saveToCloud = async (lead) => {
    try {
      const response = await fetch('http://localhost:5001/api/save-to-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead })
      });
      const data = await response.json();
      if (response.ok) {
        console.log('Cloud save successful');
      } else {
        console.warn('Cloud save failed:', data.error);
      }
    } catch (err) {
      console.error('Network error during cloud save:', err);
    }
  };

  const toggleSaveLead = (lead) => {
    const isSaved = savedLeads.some(l => l.link === lead.link);
    if (isSaved) {
      setSavedLeads(prev => prev.filter(l => l.link !== lead.link));
    } else {
      setSavedLeads(prev => [...prev, lead]);
      saveToCloud(lead); // Attempt cloud save when bookmarked
    }
  };

  const downloadCSV = () => {
    const targetLeads = activeTab === 'agent' ? leads : savedLeads;
    if (targetLeads.length === 0) return;
    
    const headers = ['Name', 'Username', 'Platform', 'Bio', 'Link'];
    const rows = targetLeads.map(l => [
      `"${l.name}"`,
      `"${l.username}"`,
      `"${l.platform}"`,
      `"${l.bio.replace(/"/g, '""')}"`,
      `"${l.link}"`
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `clientflow_leads_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getPlatformIcon = (platform) => {
    const p = platform.toLowerCase();
    if (p === 'linkedin') return '🔗';
    if (p === 'x') return '𝕏';
    if (p === 'reddit') return '👽';
    return '👤';
  };

  const renderLeads = (leadsList) => (
    <div className="leads-grid">
      {leadsList.map((lead, index) => {
        const isSaved = savedLeads.some(l => l.link === lead.link);
        return (
          <div className={`lead-card animate-in ${isSaved ? 'lead-saved' : ''}`} key={index} style={{animationDelay: `${index * 0.05}s`}}>
            <div className="lead-header">
              <div className="lead-brand">
                 <span className={`platform-badge badge-${lead.platform.toLowerCase()}`}>
                    {getPlatformIcon(lead.platform)} {lead.platform}
                 </span>
              </div>
              <button className={`btn-save ${isSaved ? 'saved' : ''}`} onClick={() => toggleSaveLead(lead)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                </svg>
              </button>
            </div>
            
            <div className="lead-body">
              <h3 className="lead-name">{lead.name}</h3>
              <p className="lead-handle">@{lead.username}</p>
              <div className="lead-bio-container">
                <p className="lead-bio">{lead.bio}</p>
              </div>
            </div>

            <div className="lead-footer">
              <a href={lead.link} target="_blank" rel="noreferrer" className="btn-view-profile">
                View Profile
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                   <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </a>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="app-container">
      <header className="header">
        <div className="logo" onClick={() => setActiveTab('agent')} style={{cursor: 'pointer'}}>ClientFlow</div>
        <nav className="nav">
          <button className={`nav-link ${activeTab === 'agent' ? 'active' : ''}`} onClick={() => setActiveTab('agent')}>Agent</button>
          <button className={`nav-link ${activeTab === 'saved' ? 'active' : ''}`} onClick={() => setActiveTab('saved')}>Saved ({savedLeads.length})</button>
          <button className={`nav-link ${activeTab === 'about' ? 'active' : ''}`} onClick={() => setActiveTab('about')}>About</button>
        </nav>
        <div className="auth-buttons">
          {user ? (
            <div className="user-profile">
              <span className="user-name">Hey, {user.name}</span>
              <button className="btn btn-secondary btn-sm" onClick={handleLogout}>Logout</button>
            </div>
          ) : (
            <>
              <button className="btn btn-secondary" onClick={() => { setAuthType('login'); setShowAuthModal(true); }}>Log in</button>
              <button className="btn btn-primary" onClick={() => { setAuthType('signup'); setShowAuthModal(true); }}>Sign up</button>
            </>
          )}
        </div>
      </header>

      {activeTab === 'agent' && (
        <>
          <main className="hero">
            <h1>Find your leads <span className="gradient-text">instantly</span>.</h1>
            <p className="hero-sub">ClientFlow by Anjan Sai Merla is the ultimate discovery engine. Real-time leads from LinkedIn, X, and Reddit.</p>

            <form id="search-form" className="search-container" onSubmit={handleSearch}>
              <div className="search-bar-premium">
                <div className="search-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
                  </svg>
                </div>
                <input 
                  type="text" 
                  className="search-input-premium" 
                  placeholder="Ask for any niche (e.g. AI SaaS Founders in London)..." 
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <button type="submit" className="search-submit-btn">
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </div>
            </form>
          </main>

          {searched && (
            <section className="results-section">
              <div className="results-header">
                <div className="results-meta">
                  <h2>{loading ? 'Discovering leads...' : `Found ${leads.length} accounts`}</h2>
                  {loading && <div className="loading-bar"><div className="loading-progress"></div></div>}
                </div>
                <button className="btn btn-export-premium" onClick={downloadCSV} disabled={leads.length === 0}>
                  Export results
                </button>
              </div>
              {renderLeads(leads)}
            </section>
          )}
        </>
      )}
      {activeTab === 'saved' && (
        <section className="results-section" style={{marginTop: '4rem'}}>
          <div className="results-header">
            <div>
              <h2 className="section-title">Saved Leads Library</h2>
              <p className="section-subtitle">Manage all your bookmarked leads from one place.</p>
            </div>
            <button className="btn btn-export-premium" onClick={downloadCSV} disabled={savedLeads.length === 0}>
              Export All to CSV
            </button>
          </div>
          {savedLeads.length > 0 ? renderLeads(savedLeads) : (
            <div className="empty-state">
              <p>You haven't saved any leads yet. Start searching to build your library.</p>
              <button className="btn btn-primary" onClick={() => setActiveTab('agent')}>Back to Agent</button>
            </div>
          )}
        </section>
      )}

      {activeTab === 'about' && (
        <section className="about-section animate-in" style={{marginTop: '4rem'}}>
          <div className="about-content">
            <h1 className="gradient-text" style={{fontSize: '3.5rem', marginBottom: '2rem'}}>The ClientFlow Vision</h1>
            <div className="about-card-large" style={{background: 'var(--bg-card)', padding: '3rem', borderRadius: '32px', border: '1px solid var(--border)', marginBottom: '3rem'}}>
              <p style={{fontSize: '1.25rem', color: '#D1D1D6', lineHeight: '1.8'}}>
                <strong>ClientFlow</strong> is a high-performance lead generation engine designed to bridge the gap between niche expertise and high-value opportunities. Created by <strong>Anjan Sai Merla</strong>, this project represents the future of agentic lead generation—where search is transformed into instantaneous client flow.
              </p>
            </div>
            
            <div className="about-grid" style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem'}}>
              <div className="about-card" style={{background: 'var(--bg-card)', padding: '2rem', borderRadius: '24px', border: '1px solid var(--border)'}}>
                <h3 style={{fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--primary)'}}>Real-Time Discovery</h3>
                <p style={{color: 'var(--text-muted)'}}>Leveraging direct search APIs and dynamic scraping agents to bypass traditional discovery friction across LinkedIn, X, and Reddit.</p>
              </div>
              <div className="about-card" style={{background: 'var(--bg-card)', padding: '2rem', borderRadius: '24px', border: '1px solid var(--border)'}}>
                <h3 style={{fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--primary)'}}>Cloud Persistence</h3>
                <p style={{color: 'var(--text-muted)'}}>Seamlessly export your curated leads directly to Google Sheets for automated outreach campaigns and CRM integration.</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {showAuthModal && (
        <div className="modal-overlay" onClick={() => setShowAuthModal(false)} style={{position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <div className="modal-content animate-in" onClick={e => e.stopPropagation()} style={{background: '#121214', padding: '3rem', borderRadius: '32px', border: '1px solid var(--border)', width: '100%', maxWidth: '450px', position: 'relative'}}>
            <h2 className="gradient-text" style={{fontSize: '2rem', marginBottom: '0.5rem'}}>{authType === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
            <p style={{color: 'var(--text-muted)', marginBottom: '2rem'}}>{authType === 'login' ? 'Access your saved leads library.' : 'Join ClientFlow to start scaling your outreach.'}</p>
            
            <form onSubmit={handleAuthSubmit} style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
              {authType === 'signup' && (
                <input type="text" name="name" placeholder="Full Name" required style={{background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem', color: 'white', outline: 'none'}} />
              )}
              <input type="email" name="email" placeholder="Email Address" required style={{background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem', color: 'white', outline: 'none'}} />
              <input type="password" placeholder="Password" required style={{background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem', color: 'white', outline: 'none'}} />
              <button type="submit" className="btn btn-primary" style={{width: '100%', marginTop: '1rem', padding: '1rem'}}>
                {authType === 'login' ? 'Login' : 'Get Started'}
              </button>
            </form>
            
            <button className="btn-text" style={{background: 'none', border: 'none', color: 'var(--text-muted)', width: '100%', marginTop: '1.5rem', cursor: 'pointer', fontSize: '0.9rem'}} onClick={() => setAuthType(authType === 'login' ? 'signup' : 'login')}>
              {authType === 'login' ? "Don't have an account? Sign up" : "Already have an account? Login"}
            </button>
            
            <button className="modal-close" onClick={() => setShowAuthModal(false)} style={{position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer'}}>×</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
