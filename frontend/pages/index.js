import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { apiClient } from '../lib/apiClient';
import { useUser } from '../context/UserContext';

export default function Home() {
  const [content, setContent] = useState('');
  const [topic, setTopic] = useState('');
  const [useRAG, setUseRAG] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { user } = useUser();

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Load saved content and topic from localStorage on page load
  useEffect(() => {
    const savedContent = localStorage.getItem('learningContent');
    const savedTopic = localStorage.getItem('learningTopic');
    
    if (savedContent) {
      setContent(savedContent);
    }
    if (savedTopic) {
      setTopic(savedTopic);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!content.trim()) {
      setError('Please enter learning content');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await apiClient.post('/api/generate-quiz', { content, useRAG, topic }, {
        headers: getAuthHeaders()
      });
      
      // Store quiz data and original content in localStorage
      localStorage.setItem('quizData', JSON.stringify(response.data));
      localStorage.setItem('originalContent', content);
      localStorage.setItem('quizTopic', topic || 'General');
      
      // Navigate to quiz page
      router.push('/quiz');
    } catch (err) {
      setError('Failed to generate quiz. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>AI Education System - Input</title>
        <meta name="description" content="AI-powered learning system" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="container">
        <div className="card">
          <h1>🧠 AI Education System</h1>
          <p className="subtitle">Enter learning content to generate a quiz</p>
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="topic">Topic (optional)</label>
              <input
                id="topic"
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Mathematics, Physics, History"
                className="input-field"
                disabled={loading}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="content">Learning Content</label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter learning material to generate quiz questions..."
                rows={8}
                disabled={loading}
              />
            </div>
            
            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={useRAG}
                  onChange={(e) => setUseRAG(e.target.checked)}
                  disabled={loading}
                />
                <span className="checkbox-text">
                  Use Knowledge Base (RAG) - Retrieve relevant documents for enhanced quiz generation
                </span>
              </label>
            </div>
            
            <div className="button-group">
              <button 
                type="button"
                onClick={() => {
                  if (content.trim()) {
                    localStorage.setItem('learningContent', content);
                    localStorage.setItem('learningTopic', topic || 'General');
                    router.push('/learning');
                  } else {
                    setError('Please enter learning content first');
                  }
                }} 
                disabled={loading} 
                className="btn-secondary"
              >
                Learning Mode
              </button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Generating...' : 'Generate Quiz'}
              </button>
            </div>
            
            {error && <div className="error">{error}</div>}
          </form>

          <div className="navigation-links">
            <button onClick={() => router.push('/knowledge-base')} className="btn-link">
              📚 Manage Knowledge Base
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
