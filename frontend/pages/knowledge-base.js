import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { apiClient } from '../lib/apiClient';
import { useUser } from '../context/UserContext';

export default function KnowledgeBase() {
  const [documents, setDocuments] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [expandedDocId, setExpandedDocId] = useState(null);
  const [editingDocId, setEditingDocId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const router = useRouter();
  const { user } = useUser();

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    if (user) {
      loadDocuments();
    }
  }, [user]);

  const loadDocuments = async () => {
    try {
      const response = await apiClient.get('/api/knowledge-base', {
        headers: getAuthHeaders()
      });
      setDocuments(response.data.documents);
    } catch (err) {
      setError('Failed to load documents');
      console.error(err);
    }
  };

  const handleAddDocument = async (e) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim()) {
      setError('Please enter title and content');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await apiClient.post('/api/knowledge-base', { title, content }, {
        headers: getAuthHeaders()
      });
      setTitle('');
      setContent('');
      await loadDocuments();
    } catch (err) {
      setError('Failed to add document');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (id) => {
    try {
      await apiClient.delete(`/api/knowledge-base/${id}`, {
        headers: getAuthHeaders()
      });
      await loadDocuments();
    } catch (err) {
      setError('Failed to delete document');
      console.error(err);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to clear all documents?')) {
      return;
    }

    try {
      await apiClient.delete('/api/knowledge-base', {
        headers: getAuthHeaders()
      });
      await loadDocuments();
    } catch (err) {
      setError('Failed to clear knowledge base');
      console.error(err);
    }
  };

  const handleEditDocument = (doc) => {
    setEditingDocId(doc.id);
    setEditTitle(doc.title);
    setEditContent(doc.content);
    setExpandedDocId(doc.id);
  };

  const handleCancelEdit = () => {
    setEditingDocId(null);
    setEditTitle('');
    setEditContent('');
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim() || !editContent.trim()) {
      setError('Title and content are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await apiClient.put(`/api/knowledge-base/${editingDocId}`, {
        title: editTitle,
        content: editContent
      }, {
        headers: getAuthHeaders()
      });
      setEditingDocId(null);
      setEditTitle('');
      setEditContent('');
      await loadDocuments();
    } catch (err) {
      setError('Failed to update document');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) {
      setError('Please enter a search query');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await apiClient.post('/api/knowledge-base/search', {
        query: searchQuery,
        topK: 3,
        minScore: 0.3
      }, {
        headers: getAuthHeaders()
      });
      setSearchResults(response.data.results);
    } catch (err) {
      setError('Failed to search knowledge base');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>AI Education System - Knowledge Base</title>
        <meta name="description" content="AI-powered learning system" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="container">
        <div className="card">
          <h1>📚 Knowledge Base</h1>
          <p className="subtitle">Manage your learning documents for RAG</p>
          
          {/* Add Document Form */}
          <div className="section">
            <h2>Add Document</h2>
            <form onSubmit={handleAddDocument}>
              <div className="form-group">
                <label htmlFor="title">Document Title</label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter document title..."
                  className="input-field"
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label htmlFor="content">Document Content</label>
                <textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Enter learning material to add to the knowledge base..."
                  rows={6}
                  disabled={loading}
                />
              </div>
              
              {error && <div className="error">{error}</div>}
              
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Adding...' : 'Add Document'}
              </button>
            </form>
          </div>

          {/* Search Form */}
          <div className="section">
            <h2>Search Knowledge Base</h2>
            <form onSubmit={handleSearch}>
              <div className="form-group">
                <label htmlFor="search">Search Query</label>
                <input
                  id="search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter search query..."
                  disabled={loading}
                  className="search-input"
                />
              </div>
              
              <button type="submit" disabled={loading} className="btn-secondary">
                {loading ? 'Searching...' : 'Search'}
              </button>
            </form>

            {searchResults.length > 0 && (
              <div className="search-results">
                <h3>Search Results</h3>
                {searchResults.map((result, index) => (
                  <div key={result.id} className="result-item">
                    <div className="result-header">
                      <strong>Document {index + 1}</strong>
                      <span className="similarity-score">
                        Similarity: {(result.similarity * 100).toFixed(1)}%
                      </span>
                    </div>
                    <p className="result-content">{result.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Document List */}
          <div className="section">
            <div className="section-header">
              <h2>Documents ({documents.length})</h2>
              {documents.length > 0 && (
                <button onClick={handleClearAll} className="btn-danger">
                  Clear All
                </button>
              )}
            </div>
            
            {documents.length === 0 ? (
              <p className="empty-state">No documents in knowledge base</p>
            ) : (
              <div className="document-list">
                {documents.map((doc) => (
                  <div key={doc.id} className="document-item">
                    <div className="document-content">
                      <div 
                        className="document-title"
                        onClick={() => {
                          if (editingDocId !== doc.id) {
                            setExpandedDocId(expandedDocId === doc.id ? null : doc.id);
                          }
                        }}
                      >
                        <span className="document-title-text">{doc.title}</span>
                        <span className="expand-icon">
                          {expandedDocId === doc.id ? '▼' : '▶'}
                        </span>
                      </div>
                      {expandedDocId === doc.id && (
                        <>
                          {editingDocId === doc.id ? (
                            <div className="edit-form">
                              <div className="form-group">
                                <label htmlFor={`edit-title-${doc.id}`}>Edit Title</label>
                                <input
                                  id={`edit-title-${doc.id}`}
                                  type="text"
                                  value={editTitle}
                                  onChange={(e) => setEditTitle(e.target.value)}
                                  className="input-field"
                                  disabled={loading}
                                />
                              </div>
                              <div className="form-group">
                                <label htmlFor={`edit-content-${doc.id}`}>Edit Content</label>
                                <textarea
                                  id={`edit-content-${doc.id}`}
                                  value={editContent}
                                  onChange={(e) => setEditContent(e.target.value)}
                                  rows={6}
                                  className="input-field"
                                  disabled={loading}
                                />
                              </div>
                              <div className="edit-buttons">
                                <button onClick={handleSaveEdit} disabled={loading} className="btn-primary">
                                  {loading ? 'Saving...' : 'Save'}
                                </button>
                                <button onClick={handleCancelEdit} disabled={loading} className="btn-secondary">
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="document-full-content">
                              {doc.content}
                            </div>
                          )}
                        </>
                      )}
                      <small className="document-meta">
                        Added: {new Date(doc.timestamp).toLocaleString()}
                      </small>
                    </div>
                    <div className="document-actions">
                      {editingDocId !== doc.id && (
                        <button
                          onClick={() => handleEditDocument(doc)}
                          className="btn-edit"
                        >
                          Edit
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="btn-delete"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="button-group">
            <button onClick={() => router.push('/')} className="btn-secondary">
              Back to Home
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
