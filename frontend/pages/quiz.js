import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import { useUser } from '../context/UserContext';

export default function Quiz() {
  const [quizData, setQuizData] = useState(null);
  const [userAnswers, setUserAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { user } = useUser();

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    // Load quiz data from localStorage
    const storedQuiz = localStorage.getItem('quizData');
    if (!storedQuiz) {
      router.push('/');
      return;
    }
    setQuizData(JSON.parse(storedQuiz));
  }, [router]);

  const handleAnswerChange = (questionId, answer) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if all questions are answered
    const unansweredQuestions = quizData.questions.filter(
      q => !userAnswers[q.id]
    );

    if (unansweredQuestions.length > 0) {
      setError('Please answer all questions before submitting');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const originalContent = localStorage.getItem('originalContent');
      const topic = localStorage.getItem('quizTopic') || 'General';
      
      const response = await axios.post('/api/evaluate', {
        questions: quizData.questions,
        userAnswers,
        content: originalContent,
        topic
      }, {
        headers: getAuthHeaders()
      });
      
      // Calculate score
      const correctAnswers = response.data.results.filter(r => r.correct).length;
      const score = Math.round((correctAnswers / quizData.questions.length) * 100);
      
      // Save quiz result if user is logged in
      if (user) {
        try {
          await axios.post('/api/quiz-results', {
            topic,
            difficulty: quizData.difficulty || 1,
            score,
            totalQuestions: quizData.questions.length,
            correctAnswers,
            timeTaken: null, // Can be added later
            content: originalContent
          }, {
            headers: getAuthHeaders()
          });
        } catch (saveError) {
          console.error('Failed to save quiz result:', saveError);
          // Don't block the user if saving fails
        }
      }
      
      // Store evaluation results
      localStorage.setItem('evaluationResults', JSON.stringify(response.data));
      localStorage.setItem('userAnswers', JSON.stringify(userAnswers));
      
      // Navigate to result page
      router.push('/result');
    } catch (err) {
      setError('Failed to evaluate answers. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.push('/');
  };

  if (!quizData) {
    return <div className="container">Loading...</div>;
  }

  return (
    <>
      <Head>
        <title>AI Education System - Quiz</title>
        <meta name="description" content="AI-powered learning system" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="container">
        <div className="card">
          <h1>📝 Quiz Time</h1>
          <p className="subtitle">Answer the following questions</p>
          
          <form onSubmit={handleSubmit}>
            {quizData.questions.map((question, index) => (
              <div key={question.id} className="question-block">
                <h3>
                  Question {index + 1}: {question.question}
                </h3>
                <div className="options">
                  {Object.entries(question.options).map(([key, value]) => (
                    <label key={key} className="option-label">
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        value={key}
                        checked={userAnswers[question.id] === key}
                        onChange={() => handleAnswerChange(question.id, key)}
                        disabled={loading}
                      />
                      <span className="option-text">
                        <strong>{key}:</strong> {value}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
            
            {error && <div className="error">{error}</div>}
            
            <div className="button-group">
              <button type="button" onClick={handleBack} disabled={loading} className="btn-secondary">
                Back
              </button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Evaluating...' : 'Submit Answers'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </>
  );
}
