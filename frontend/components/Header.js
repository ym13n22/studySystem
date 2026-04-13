import { useState } from 'react';
import { useRouter } from 'next/router';
import { useUser } from '../context/UserContext';

export default function Header() {
  const { user, logout } = useUser();
  const [showDropdown, setShowDropdown] = useState(false);
  const router = useRouter();

  const handleLogout = () => {
    logout();
    setShowDropdown(false);
    router.push('/');
  };

  return (
    <header className="header">
      <div className="header-content">
        <div className="logo" onClick={() => router.push('/')}>
          🧠 AI Education
        </div>
        
        <div className="header-nav">
          {user ? (
            <div className="user-menu">
              <button 
                className="user-menu-button"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                👤 {user.name || user.email}
              </button>
              
              {showDropdown && (
                <div className="user-dropdown show">
                  <button className="user-dropdown-item" onClick={() => router.push('/knowledge-base')}>
                    📚 Knowledge Base
                  </button>
                  <hr className="user-dropdown-divider" />
                  <button className="user-dropdown-item danger" onClick={handleLogout}>
                    🚪 Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="auth-buttons">
              <button onClick={() => router.push('/login')} className="btn-link">
                Login
              </button>
              <button onClick={() => router.push('/signup')} className="btn-primary" style={{ marginLeft: '10px' }}>
                Sign Up
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
