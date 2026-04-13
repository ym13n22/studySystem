import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { apiClient } from '../lib/apiClient';

export default function Result() {
  const [evaluation, setEvaluation] = useState(null);
  const [quizData, setQuizData] = useState(null);
  const router = useRouter();

  useEffect(() => {
    // Load evaluation results and quiz data from localStorage
    const storedEvaluation = localStorage.getItem('evaluationResults');
    const storedQuizData = localStorage.getItem('quizData');
    
    if (!storedEvaluation) {
      router.push('/');
      return;
    }
    
    setEvaluation(JSON.parse(storedEvaluation));
    if (storedQuizData) {
      setQuizData(JSON.parse(storedQuizData));
    }

    // Save weaknesses and suggestions if user is logged in
    const token = localStorage.getItem('token');
    if (token && storedEvaluation) {
      const evalData = JSON.parse(storedEvaluation);
      const topic = localStorage.getItem('quizTopic') || 'General';
      
      if (evalData.summary) {
        const { weaknesses, suggestions } = parseSummary(evalData.summary);
        if (weaknesses.length > 0) {
          saveWeaknesses(topic, weaknesses);
        }
        if (suggestions.length > 0) {
          saveSuggestions(topic, suggestions);
        }
      }
    }

    // Clear learning plan cache so it will be refreshed on next load
    localStorage.removeItem('cachedLearningPlan');
  }, [router]);

  const handleRestart = () => {
    // Clear localStorage
    localStorage.removeItem('quizData');
    localStorage.removeItem('originalContent');
    localStorage.removeItem('evaluationResults');
    localStorage.removeItem('userAnswers');
    
    router.push('/');
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const saveWeaknesses = async (topic, weaknesses) => {
    try {
      const weaknessesData = weaknesses.map(w => ({
        description: w,
        weight: 3
      }));

      await apiClient.post('/api/user-weaknesses', {
        topic,
        weaknesses: weaknessesData
      }, {
        headers: getAuthHeaders()
      });
    } catch (error) {
      console.error('Failed to save weaknesses:', error);
    }
  };

  const saveSuggestions = async (topic, suggestions) => {
    try {
      const suggestionsData = suggestions.map(s => ({
        description: s,
        weight: 2
      }));

      await apiClient.post('/api/user-suggestions', {
        topic,
        suggestions: suggestionsData
      }, {
        headers: getAuthHeaders()
      });
    } catch (error) {
      console.error('Failed to save suggestions:', error);
    }
  };

  const parseSummary = (summaryText) => {
    if (!summaryText) return { strengths: [], weaknesses: [], suggestions: [] };
    
    const lines = summaryText.split('\n');
    let currentSection = '';
    const strengths = [];
    const weaknesses = [];
    const suggestions = [];
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      
      if (trimmedLine.toLowerCase().includes('strengths') || trimmedLine.toLowerCase().includes('强项')) {
        currentSection = 'strengths';
      } else if (trimmedLine.toLowerCase().includes('weaknesses') || trimmedLine.toLowerCase().includes('弱项')) {
        currentSection = 'weaknesses';
      } else if (trimmedLine.toLowerCase().includes('suggestions') || trimmedLine.toLowerCase().includes('建议')) {
        currentSection = 'suggestions';
      } else if (trimmedLine.startsWith('-') && currentSection) {
        const item = trimmedLine.substring(1).trim();
        if (item) {
          if (currentSection === 'strengths') strengths.push(item);
          else if (currentSection === 'weaknesses') weaknesses.push(item);
          else if (currentSection === 'suggestions') suggestions.push(item);
        }
      }
    });
    
    return { strengths, weaknesses, suggestions };
  };

  const parseStepReference = (text) => {
    // Parse step references like "Step 3: [title]"
    const stepRegex = /Step (\d+):/i;
    const match = text.match(stepRegex);
    if (match) {
      return parseInt(match[1]) - 1; // Convert to 0-based index
    }
    return null;
  };

  const handleStepClick = (stepIndex) => {
    localStorage.setItem('selectedStepIndex', stepIndex.toString());
    router.push('/learning');
  };

  const renderSuggestion = (item, index) => {
    const stepIndex = parseStepReference(item);
    if (stepIndex !== null) {
      // Make step reference clickable
      const parts = item.split(/(Step \d+:)/i);
      return (
        <li key={index}>
          {parts.map((part, i) => {
            if (part.match(/Step \d+:/i)) {
              const match = part.match(/Step (\d+):/i);
              const idx = parseInt(match[1]) - 1;
              return (
                <span 
                  key={i}
                  className="step-reference"
                  onClick={() => handleStepClick(idx)}
                >
                  {part}
                </span>
              );
            }
            return part;
          })}
        </li>
      );
    }
    return <li key={index}>{item}</li>;
  };

  if (!evaluation) {
    return <div className="container">Loading...</div>;
  }

  const { results, explanations = [], summary } = evaluation;
  const questions = quizData?.questions || [];
  const { strengths, weaknesses, suggestions } = parseSummary(summary);

  return (
    <>
      <Head>
        <title>AI Education System - Result</title>
        <meta name="description" content="AI-powered learning system" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="container">
        <div className="card">
          <h1>🎯 Quiz Results</h1>
          
          <div className="score-display">
            <div className="score-circle">
              <span className="score-number">{evaluation.score}</span>
              <span className="score-label">Score</span>
            </div>
          </div>
          
          <div className="questions-section">
            <h3>题目详解</h3>
            {results.map((result, index) => (
              <div key={index} className="question-box">
                <div className="question-header">
                  <span className="question-number">题目 {index + 1}</span>
                  <span className={`status-badge ${result.correct ? 'correct' : 'incorrect'}`}>
                    {result.correct ? '✓ 正确' : '✗ 错误'}
                  </span>
                </div>
                
                <div className="question-content">
                  <p className="question-text">{result.question}</p>
                  
                  <div className="options-list">
                    {questions[index]?.options && Object.entries(questions[index].options).map(([key, value]) => {
                      const isUserAnswer = key === result.userAnswer;
                      const isCorrectAnswer = key === result.correctAnswer;
                      
                      let className = 'option-item';
                      if (isCorrectAnswer) {
                        className += ' correct-option';
                      } else if (isUserAnswer && !result.correct) {
                        className += ' wrong-option';
                      }
                      
                      return (
                        <div key={key} className={className}>
                          <span className="option-key">{key}.</span>
                          <span className="option-value">{value}</span>
                          {isCorrectAnswer && <span className="correct-mark">✓</span>}
                          {isUserAnswer && !result.correct && <span className="wrong-mark">✗</span>}
                        </div>
                      );
                    })}
                  </div>
                  
                  {explanations[index] && (
                    <div className="explanation-box">
                      <strong>解释：</strong>
                      <p>{explanations[index]}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {(strengths.length > 0 || weaknesses.length > 0 || suggestions.length > 0) && (
            <div className="summary-section">
              <h3>学习总结</h3>
              
              {strengths.length > 0 && (
                <div className="summary-item strengths">
                  <h4>✓ 强项</h4>
                  <ul>
                    {strengths.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {weaknesses.length > 0 && (
                <div className="summary-item weaknesses">
                  <h4>⚠️ 弱项</h4>
                  <ul>
                    {weaknesses.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {suggestions.length > 0 && (
                <div className="summary-item suggestions">
                  <h4>💡 改进建议</h4>
                  <ul>
                    {suggestions.map((item, index) => renderSuggestion(item, index))}
                  </ul>
                </div>
              )}
            </div>
          )}
          
          <button onClick={handleRestart} className="btn-primary">
            Back to Home
          </button>
        </div>
      </main>
    </>
  );
}
