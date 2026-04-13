import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { apiClient } from '../lib/apiClient';
import { useUser } from '../context/UserContext';

export default function Learning() {
  const [content, setContent] = useState('');
  const [topic, setTopic] = useState('General');
  const [difficulty, setDifficulty] = useState(1);
  const [mode, setMode] = useState('plan'); // 'plan', 'flashcard' or 'qa'
  const [flashcards, setFlashcards] = useState(null);
  const [currentCard, setCurrentCard] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { user } = useUser();
  const conversationEndRef = useRef(null);

  // Learning plan state
  const [learningPlan, setLearningPlan] = useState(null);
  const [showLearningPlan, setShowLearningPlan] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(null);
  const [currentStep, setCurrentStep] = useState(null);
  const [isUpdatingProgress, setIsUpdatingProgress] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    // Load content from localStorage
    const storedContent = localStorage.getItem('learningContent');
    const storedTopic = localStorage.getItem('learningTopic');
    
    if (!storedContent) {
      router.push('/');
      return;
    }
    
    setContent(storedContent);
    setTopic(storedTopic || 'General');

    // Fetch user progress for difficulty if user is logged in
    if (user && storedTopic) {
      fetchUserProgress(storedTopic);
      // Don't auto-fetch learning plan - it will be fetched only when needed
    }
  }, [router, user]);

  // Check if a specific step was selected from quiz results
  useEffect(() => {
    const selectedStepIndex = localStorage.getItem('selectedStepIndex');
    if (selectedStepIndex !== null && learningPlan) {
      const stepIndex = parseInt(selectedStepIndex);
      if (stepIndex >= 0 && stepIndex < learningPlan.plan.length) {
        handleStepClick(learningPlan.plan[stepIndex], stepIndex);
        localStorage.removeItem('selectedStepIndex');
      }
    }
  }, [learningPlan]);

  // Auto-generate learning plan if it doesn't exist
  useEffect(() => {
    const checkAndGeneratePlan = async () => {
      if (user && content && topic && !learningPlan && !loading) {
        // First check if plan exists in database
        try {
          const response = await apiClient.get('/api/learning-plan', {
            headers: getAuthHeaders(),
            params: { topic }
          });
          
          if (response.data.plan) {
            setLearningPlan(response.data);
          } else {
            generateLearningPlan();
          }
        } catch (err) {
          console.error('Error checking learning plan:', err);
        }
      }
    };
    
    checkAndGeneratePlan();
  }, [user, content, topic]);

  const fetchUserProgress = async (topicName) => {
    try {
      const response = await apiClient.get('/api/user-progress', {
        headers: getAuthHeaders(),
        params: { topic: topicName }
      });
      
      if (response.data.progress && response.data.progress.length > 0) {
        setDifficulty(response.data.progress[0].current_difficulty);
      }
    } catch (err) {
      console.error('Failed to fetch user progress:', err);
    }
  };

  const fetchLearningPlan = async (topicName) => {
    if (isUpdatingProgress) return; // Skip refetch during progress update
    
    try {
      const response = await apiClient.get('/api/learning-plan', {
        headers: getAuthHeaders(),
        params: { topic: topicName }
      });
      
      if (response.data.plan) {
        setLearningPlan(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch learning plan:', err);
    }
  };

  const generateLearningPlan = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await apiClient.post('/api/generate-learning-plan', {
        content,
        topic
      }, {
        headers: getAuthHeaders()
      });
      
      setLearningPlan(response.data);
      setShowLearningPlan(true);
    } catch (err) {
      setError('Failed to generate learning plan. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStepClick = async (step, index) => {
    setLoading(true);
    setIsRegenerating(true);
    setError('');
    setFlashcards(null);
    setCurrentCard(0);
    setFlipped(false);
    setCurrentStepIndex(index);
    setCurrentStep(step);

    try {
      const response = await apiClient.post('/api/generate-flashcards', {
        content,
        difficulty,
        topic,
        stepFocus: step.description
      }, {
        headers: getAuthHeaders()
      });
      
      setFlashcards(response.data.flashcards);
      setMode('flashcard');
    } catch (err) {
      setError('Failed to generate flashcards for this step. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
      setIsRegenerating(false);
    }
  };

  const markStepAsCompleted = async (stepIndex) => {
    setIsUpdatingProgress(true);
    try {
      const newCompletedSteps = Math.min(learningPlan.total_steps, stepIndex + 1);
      const newProgressPercentage = Math.round((newCompletedSteps / learningPlan.total_steps) * 100);

      await apiClient.post('/api/learning-progress', {
        topic,
        completed_steps: newCompletedSteps,
        progress_percentage: newProgressPercentage
      }, {
        headers: getAuthHeaders()
      });

      setLearningPlan({
        ...learningPlan,
        completed_steps: newCompletedSteps,
        progress_percentage: newProgressPercentage
      });

      setCurrentStepIndex(null);
    } catch (err) {
      console.error('Failed to mark step as completed:', err);
    } finally {
      setIsUpdatingProgress(false);
    }
  };

  // Q&A state
  const [question, setQuestion] = useState('');
  const [conversation, setConversation] = useState([]);
  const [answer, setAnswer] = useState('');

  // Auto-scroll to bottom when conversation updates
  useEffect(() => {
    if (conversationEndRef.current) {
      conversationEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversation]);

  const handleNextCard = () => {
    if (currentCard < flashcards.length - 1) {
      setCurrentCard(currentCard + 1);
      setFlipped(false);
    } else {
      // Last card, mark step as completed
      if (currentStepIndex !== null && learningPlan) {
        markStepAsCompleted(currentStepIndex);
      }
    }
  };

  // Check if we've reached the last card and mark as completed
  useEffect(() => {
    if (flashcards && currentCard === flashcards.length - 1 && currentStepIndex !== null && learningPlan) {
      markStepAsCompleted(currentStepIndex);
    }
  }, [currentCard, flashcards]);

  const handlePrevCard = () => {
    if (currentCard > 0) {
      setCurrentCard(currentCard - 1);
      setFlipped(false);
    }
  };

  const handleFlip = () => {
    setFlipped(!flipped);
  };

  const handleAskQuestion = async (e) => {
    e.preventDefault();
    
    if (!question.trim()) {
      setError('Please enter a question');
      return;
    }

    setLoading(true);
    setError('');
    setAnswer('');

    try {
      const response = await apiClient.post('/api/qa', {
        content,
        question,
        conversationHistory: conversation,
        difficulty,
        topic
      });
      
      const newMessage = {
        role: 'user',
        content: question
      };
      
      const newAnswer = {
        role: 'assistant',
        content: response.data.answer
      };

      setConversation([...conversation, newMessage, newAnswer]);
      setAnswer(response.data.answer);
      setQuestion('');
    } catch (err) {
      setError('Failed to get answer. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.push('/');
  };

  return (
    <>
      <Head>
        <title>AI Education System - Learning Module</title>
        <meta name="description" content="AI-powered learning system" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="container">
        <div className="card">
          <h1>📚 Learning Module</h1>
          <p className="subtitle">Study with flashcards or ask questions about the content</p>
          
          {/* Mode Toggle */}
          <div className="mode-toggle">
            <button
              className={mode === 'plan' ? 'active' : ''}
              onClick={() => setMode('plan')}
            >
              Learning Plan
            </button>
            <button
              className={mode === 'qa' ? 'active' : ''}
              onClick={() => setMode('qa')}
            >
              Q&A
            </button>
          </div>

          {error && <div className="error">{error}</div>}

          {/* Learning Plan Mode */}
          {mode === 'plan' && (
            <div className="section">
              <h2>Learning Plan</h2>
              {loading && !learningPlan ? (
                <p>Generating learning plan...</p>
              ) : learningPlan ? (
                <div className="learning-plan-container">
                  {/* Progress Bar */}
                  <div className="progress-section">
                    <h3>Progress</h3>
                    <div className="progress-bar-container">
                      <div className="progress-bar">
                        <div 
                          className="progress-fill" 
                          style={{ width: `${learningPlan.progress_percentage}%` }}
                        ></div>
                      </div>
                      <span className="progress-text">
                        {learningPlan.completed_steps}/{learningPlan.total_steps} steps ({learningPlan.progress_percentage}%)
                      </span>
                    </div>
                  </div>

                  {/* Learning Plan Steps */}
                  <div className="plan-steps">
                    <h3>Learning Steps</h3>
                    {learningPlan.plan.map((step, index) => (
                      <div 
                        key={index} 
                        className={`plan-step clickable ${index < learningPlan.completed_steps ? 'completed' : ''}`}
                        onClick={() => handleStepClick(step, index)}
                      >
                        <div className="step-header">
                          <span className="step-number">Step {step.step}</span>
                          <span className={`step-status ${index < learningPlan.completed_steps ? 'completed' : ''}`}>
                            {index < learningPlan.completed_steps ? '✓ Completed' : 'Click to study'}
                          </span>
                        </div>
                        <h4 className="step-title">{step.title}</h4>
                        <p className="step-description">{step.description}</p>
                        <p className="step-hint">Click to generate flashcards for this step</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* Flashcard Mode */}
          {mode === 'flashcard' && (
            <div className="section">
              <h2>Flashcards</h2>
              {!flashcards ? (
                isRegenerating ? (
                  <p>Regenerating flashcards...</p>
                ) : (
                  <p>Generating</p>
                )
              ) : (
                <div className="flashcard-container">
                  <div className="flashcard">
                    <div
                      className={`flashcard-inner ${flipped ? 'flipped' : ''}`}
                      onClick={handleFlip}
                    >
                      <div className="flashcard-front">
                        <h3>Question</h3>
                        <p>{flashcards[currentCard].front}</p>
                      </div>
                      <div className="flashcard-back">
                        <h3>Answer</h3>
                        <p>{flashcards[currentCard].back}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flashcard-controls">
                    <button onClick={handlePrevCard} disabled={currentCard === 0}>
                      Previous
                    </button>
                    <span>{currentCard + 1} / {flashcards.length}</span>
                    <button onClick={handleNextCard} disabled={currentCard === flashcards.length - 1}>
                      Next
                    </button>
                  </div>
                  <button onClick={() => {
                    if (currentStep) {
                      handleStepClick(currentStep, currentStepIndex);
                    } else {
                      setFlashcards(null);
                    }
                  }} className="btn-secondary">
                    Regenerate
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Q&A Mode */}
          {mode === 'qa' && (
            <div className="section">
              <h2>Q&A</h2>
              <div className="qa-container">
                <div className="conversation">
                  {conversation.length === 0 ? (
                    <p className="empty-state">No questions yet. Ask your first question!</p>
                  ) : (
                    <>
                      {conversation.map((msg, index) => (
                        <div key={index} className={`message ${msg.role}`}>
                          <strong>{msg.role === 'user' ? 'You' : 'AI Tutor'}:</strong>
                          <p>{msg.content}</p>
                        </div>
                      ))}
                      <div ref={conversationEndRef} />
                    </>
                  )}
                </div>
                <form onSubmit={handleAskQuestion} className="qa-form">
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Ask a question about the content..."
                    disabled={loading}
                    className="input-field"
                  />
                  <button type="submit" disabled={loading} className="btn-primary">
                    {loading ? 'Thinking...' : 'Ask'}
                  </button>
                </form>
              </div>
            </div>
          )}

          <div className="button-group">
            <button onClick={handleBack} className="btn-secondary">
              Back to Home
            </button>
            {mode !== 'plan' && (
              <button onClick={() => setMode('plan')} className="btn-secondary">
                Back to Plan
              </button>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
