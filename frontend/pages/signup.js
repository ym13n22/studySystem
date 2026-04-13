import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { apiClient } from '../lib/apiClient';
import { useUser } from '../context/UserContext';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { login } = useUser();

  const handleSignup = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await apiClient.post('/api/auth/signup', { email, password, name });
      
      // Update global user state using UserContext
      login(response.data.user, response.data.token);
      
      // Navigate to home
      router.push('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>AI Education System - Sign Up</title>
        <meta name="description" content="AI-powered learning system" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="container">
        <div className="card">
          <h1>📝 Sign Up</h1>
          <p className="subtitle">Create your account</p>
          
          <form onSubmit={handleSignup}>
            <div className="form-group">
              <label htmlFor="name">Name (optional)</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                disabled={loading}
                className="input-field"
              />
            </div>
            
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
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>

          <div className="auth-links">
            <p>Already have an account? <button onClick={() => router.push('/login')} className="btn-link">Login</button></p>
          </div>
        </div>
      </main>
    </>
  );
}
