import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { apiClient } from '../lib/apiClient';
import { useUser } from '../context/UserContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { login } = useUser();

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await apiClient.post('/api/auth/login', { email, password });
      
      // Update global user state using UserContext
      login(response.data.user, response.data.token);
      
      // Navigate to home
      router.push('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>AI Education System - Login</title>
        <meta name="description" content="AI-powered learning system" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="container">
        <div className="card">
          <h1>🔐 Login</h1>
          <p className="subtitle">Sign in to your account</p>
          
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                disabled={loading}
                className="input-field"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                className="input-field"
              />
            </div>
            
            {error && <div className="error">{error}</div>}
            
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="auth-links">
            <p>Don't have an account? <button onClick={() => router.push('/signup')} className="btn-link">Sign up</button></p>
          </div>
        </div>
      </main>
    </>
  );
}
