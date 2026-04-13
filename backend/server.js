require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');
const vectorStore = require('./rag/vectorStore');
const { generateEmbedding } = require('./rag/embeddingService');
const supabase = require('./config/supabase');
const { generateToken, authenticateToken } = require('./middleware/auth');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize AI clients
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

// Hugging Face API configuration (commented out)
// const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;
// const HUGGINGFACE_MODEL = process.env.HUGGINGFACE_MODEL || 'mistralai/Mistral-7B-Instruct-v0.3';

// Local model configuration (Ollama)
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';

// Function to call local Ollama model
async function generateWithLocalModel(prompt) {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error('Local model fallback failed:', error);
    throw error;
  }
}

// Function to call Hugging Face API (commented out)
// async function generateWithHuggingFace(prompt) {
//   try {
//     const response = await fetch(`https://router.huggingface.co/v1/chat/completions`, {
//       method: 'POST',
//       headers: {
//         'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({
//         model: HUGGINGFACE_MODEL,
//         messages: [{ role: 'user', content: prompt }],
//         max_tokens: 1000,
//         temperature: 0.7,
//       }),
//     });
//
//     if (!response.ok) {
//       const errorText = await response.text();
//       throw new Error(`Hugging Face API error: ${response.status} - ${errorText}`);
//     }
//
//     const data = await response.json();
//     if (data.choices && data.choices.length > 0) {
//       return data.choices[0].message.content;
//     }
//     throw new Error('Unexpected response format from Hugging Face API');
//   } catch (error) {
//     console.error('Hugging Face API fallback failed:', error);
//     throw error;
//   }
// }

// Fallback function for AI generation
async function generateWithFallback(prompt, modelName = 'gemini-2.5-flash') {
  try {
    // Try Gemini first
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    // Check if it's a rate limit error (429)
    if (error.status === 429 || (error.message && error.message.includes('quota'))) {
      console.log('Gemini API rate limited, falling back to Groq...');
      
      if (!groq) {
        throw new Error('Groq API key not configured');
      }

      try {
        // Fallback to Groq
        const completion = await groq.chat.completions.create({
          messages: [{ role: 'user', content: prompt }],
          model: 'llama-3.3-70b-versatile',
        });
        return completion.choices[0].message.content;
      } catch (groqError) {
        console.error('Groq fallback also failed:', groqError);
        console.log('Both APIs rate limited, falling back to local model...');
        
        try {
          // Fallback to local model
          return await generateWithLocalModel(prompt);
        } catch (localError) {
          console.error('Local model fallback also failed:', localError);
          throw new Error('All AI generation methods failed (Gemini, Groq, and local model)');
        }
      }
    }
    
    // If it's not a rate limit error, throw the original error
    throw error;
  }
}

// Function to detect language from content
function detectLanguage(content) {
  // Check for Chinese characters
  const chineseRegex = /[\u4e00-\u9fa5]/;
  if (chineseRegex.test(content)) {
    return 'zh';
  }
  // Default to English
  return 'en';
}

// Middleware
app.use(cors());
app.use(express.json());

// API: Signup
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check if Supabase is configured
    if (!supabase) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user into database
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          email,
          password: hashedPassword,
          name: name || email.split('@')[0],
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Generate JWT token
    const token = generateToken(data.id, data.email);

    res.json({
      user: {
        id: data.id,
        email: data.email,
        name: data.name
      },
      token
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to sign up', details: error.message });
  }
});

// API: Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check if Supabase is configured
    if (!supabase) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    // Get user from database
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Compare password
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = generateToken(user.id, user.email);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login', details: error.message });
  }
});

// API: Get current user
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    // Get user from database
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, created_at')
      .eq('id', req.user.userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user', details: error.message });
  }
});

// API: Generate Flashcards
app.post('/api/generate-flashcards', async (req, res) => {
  try {
    const { content, difficulty = 1, topic, stepFocus } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Auto-detect language from content
    const language = detectLanguage(content);

    // Fetch user weaknesses and suggestions if authenticated
    let userWeaknesses = [];
    let userSuggestions = [];
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = require('./middleware/auth').verifyToken(token);
        
        if (decoded && topic) {
          const { data: weaknesses } = await supabase
            .from('user_weaknesses')
            .select('weakness_description, weight')
            .eq('user_id', decoded.userId)
            .eq('topic', topic);

          if (weaknesses) {
            userWeaknesses = weaknesses;
          }

          const { data: suggestions } = await supabase
            .from('user_suggestions')
            .select('suggestion_description, weight')
            .eq('user_id', decoded.userId)
            .eq('topic', topic);

          if (suggestions) {
            userSuggestions = suggestions;
          }
        }
      } catch (error) {
        console.error('Error fetching weaknesses:', error);
      }
    }

    const languagePrompt = language === 'zh' ? '请用中文生成' : 'Generate in English';
    const difficultyInstructions = {
      1: language === 'zh' ? '生成基础、直截了当的概念和定义，测试基本记忆。' : 'Generate basic, straightforward concepts and definitions that test fundamental memory.',
      2: language === 'zh' ? '生成需要对概念有良好理解的卡片，要求解释关系和应用。' : 'Generate cards that require good understanding of concepts, asking to explain relationships and applications.',
      3: language === 'zh' ? '生成具有挑战性的卡片，需要分析思维和比较概念。' : 'Generate moderately challenging cards that require analytical thinking and comparing concepts.',
      4: language === 'zh' ? '生成具有挑战性的卡片，需要深入分析、应用和场景理解。' : 'Generate challenging cards that require deep analysis, application, and scenario understanding.',
      5: language === 'zh' ? '生成专家级卡片，需要批判性思维、复杂概念综合和跨领域应用。' : 'Generate expert-level cards that require critical thinking, synthesis of complex concepts, and cross-domain applications.'
    };

    // Build weakness context for weighting (lower priority for flashcards)
    let weaknessContext = '';
    if (userWeaknesses.length > 0) {
      const weaknessList = userWeaknesses.map(w => 
        `- ${w.weakness_description} (priority: MEDIUM - weight: ${w.weight})`
      ).join('\n');
      weaknessContext = `
      
SECONDARY PRIORITY: The user has identified the following weaknesses in this topic. Include these areas in flashcards but prioritize suggestions first:
${weaknessList}`;
    }

    // Build suggestion context for weighting (higher priority for flashcards)
    let suggestionContext = '';
    if (userSuggestions.length > 0) {
      const suggestionList = userSuggestions.map(s => 
        `- ${s.suggestion_description} (priority: HIGH - weight: ${s.weight})`
      ).join('\n');
      suggestionContext = `
      
CRITICAL - HIGHEST PRIORITY: The user has received the following improvement suggestions. At least 6 out of 10 flashcards MUST focus on these suggestion areas. These guide what the user needs to practice:
${suggestionList}`;
    }

    const prompt = `${languagePrompt} 10 张抽认卡，每张卡有正面（问题/概念）和背面（答案/解释）。
${weaknessContext}
${suggestionContext}
${stepFocus ? `
SPECIFIC FOCUS: Generate flashcards specifically for this learning step: ${stepFocus}
All 10 flashcards should be directly related to this specific learning objective.` : ''}

学习内容:
${content}

难度级别: ${difficulty}/5
${difficultyInstructions[difficulty]}

Requirements:
- Flashcards must be strongly related to the learning content
${stepFocus ? '- CRITICAL: All flashcards MUST focus on the specific learning step: ' + stepFocus : '- CRITICAL: Suggestions have HIGHEST priority - ensure at least 6 out of 10 flashcards focus on suggestion areas'}
${stepFocus ? '' : '- Weaknesses have SECONDARY priority - include them but don\'t let them override suggestion focus'}
- Adjust flashcard difficulty based on the current difficulty level (${difficulty}/5) and user's improvement suggestions
${stepFocus ? '- The weighting hierarchy is: Specific Step (highest) > Suggestions > Weaknesses > General content' : '- The weighting hierarchy is: Suggestions (highest) > Weaknesses (medium) > General content (lowest)'}

请以以下 JSON 格式响应:
{
  "flashcards": [
    {
      "id": 1,
      "front": "问题或概念",
      "back": "答案或解释"
    }
  ]
}

只返回 JSON，不要其他文本。`;

    const text = await generateWithFallback(prompt);

    // Parse JSON response
    const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
    const flashcardData = JSON.parse(cleanedText);

    res.json(flashcardData);
  } catch (error) {
    console.error('Error generating flashcards:', error);
    res.status(500).json({ error: 'Failed to generate flashcards', details: error.message });
  }
});

// API: Multi-round Q&A
app.post('/api/qa', async (req, res) => {
  try {
    const { content, question, conversationHistory = [], difficulty = 1, topic } = req.body;

    if (!content || !question) {
      return res.status(400).json({ error: 'Content and question are required' });
    }

    // Auto-detect language from content
    const language = detectLanguage(content);

    // Fetch user weaknesses and suggestions if authenticated
    let userWeaknesses = [];
    let userSuggestions = [];
    if (req.headers.authorization && topic) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = require('./middleware/auth').verifyToken(token);
        
        if (decoded) {
          const { data: weaknesses } = await supabase
            .from('user_weaknesses')
            .select('weakness_description, weight')
            .eq('user_id', decoded.userId)
            .eq('topic', topic);

          if (weaknesses) {
            userWeaknesses = weaknesses;
          }

          const { data: suggestions } = await supabase
            .from('user_suggestions')
            .select('suggestion_description, weight')
            .eq('user_id', decoded.userId)
            .eq('topic', topic);

          if (suggestions) {
            userSuggestions = suggestions;
          }
        }
      } catch (error) {
        console.error('Error fetching weaknesses:', error);
      }
    }

    // Build conversation context
    let conversationContext = '';
    if (conversationHistory.length > 0) {
      conversationContext = '\n\nPrevious conversation:\n' + 
        conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n');
    }

    const languagePrompt = language === 'zh' ? '请用中文回答' : 'Answer in English';
    const difficultyInstructions = {
      1: language === 'zh' ? '提供简单、直接的解释。' : 'Provide simple, straightforward explanations.',
      2: language === 'zh' ? '提供需要良好理解的解释。' : 'Provide explanations that require a good understanding.',
      3: language === 'zh' ? '提供需要分析思维的深入解释。' : 'Provide in-depth explanations that require analytical thinking.',
      4: language === 'zh' ? '提供需要深入分析和应用的高级解释。' : 'Provide advanced explanations requiring deep analysis and application.',
      5: language === 'zh' ? '提供专家级的解释，需要批判性思维和综合。' : 'Provide expert-level explanations requiring critical thinking and synthesis.'
    };

    // Build weakness context for weighting
    let weaknessContext = '';
    if (userWeaknesses.length > 0) {
      const weaknessList = userWeaknesses.map(w => 
        `- ${w.weakness_description} (weight: ${w.weight})`
      ).join('\n');
      weaknessContext = `
      
IMPORTANT: The user has identified the following weaknesses in this topic. These areas need extra attention. If the question is related to these areas, provide significantly more detailed explanations with examples:
${weaknessList}`;
    }

    // Build suggestion context for weighting
    let suggestionContext = '';
    if (userSuggestions.length > 0) {
      const suggestionList = userSuggestions.map(s => 
        `- ${s.suggestion_description} (weight: ${s.weight})`
      ).join('\n');
      suggestionContext = `
      
IMPORTANT: The user has received the following improvement suggestions. Tailor your explanation depth, approach, and examples based on these:
${suggestionList}`;
    }

    const prompt = `${languagePrompt} 用户的问题，基于学习内容。\n如果内容中没有直接回答问题，请使用您的知识来帮助解释。\n\n学习内容:\n${content}\n${conversationContext}${weaknessContext}${suggestionContext}\n\n当前问题: ${question}\n\n难度级别: ${difficulty}/5\n${difficultyInstructions[difficulty]}\n\n提供清晰、有帮助的答案。如果问题涉及内容中未涵盖的内容，请提及并在有帮助的情况下提供额外背景。\n\nIMPORTANT: The weighting of weaknesses and suggestions should significantly influence explanation depth and approach. If the question relates to weakness areas, provide extra detailed explanations with step-by-step breakdowns and examples.`;

    const answer = await generateWithFallback(prompt);

    res.json({ answer });
  } catch (error) {
    console.error('Error in Q&A:', error);
    res.status(500).json({ error: 'Failed to process question', details: error.message });
  }
});

// API: Generate Quiz
app.post('/api/generate-quiz', async (req, res) => {
  try {
    const { content, useRAG = false, topic = 'General', difficulty = 1 } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Auto-detect language from content
    const language = detectLanguage(content);

    // Initialize RAG variables
    let ragContext = '';
    let ragUsed = false;
    let ragDocumentsCount = 0;

    // Fetch user progress if user is authenticated
    let userDifficulty = difficulty;
    let userWeaknesses = [];
    let userSuggestions = [];
    
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = require('./middleware/auth').verifyToken(token);
        
        if (decoded) {
          // Fetch user difficulty
          const { data: progress } = await supabase
            .from('user_progress')
            .select('current_difficulty')
            .eq('user_id', decoded.userId)
            .eq('topic', topic)
            .single();

          if (progress) {
            userDifficulty = progress.current_difficulty;
          }

          // Fetch user weaknesses
          const { data: weaknesses } = await supabase
            .from('user_weaknesses')
            .select('weakness_description, weight')
            .eq('user_id', decoded.userId)
            .eq('topic', topic);

          if (weaknesses) {
            userWeaknesses = weaknesses;
          }

          // Fetch user suggestions
          const { data: suggestions } = await supabase
            .from('user_suggestions')
            .select('suggestion_description, weight')
            .eq('user_id', decoded.userId)
            .eq('topic', topic);

          if (suggestions) {
            userSuggestions = suggestions;
          }
        }
      } catch (error) {
        console.error('Error fetching user progress:', error);
      }
    }

    // If RAG is enabled and user is authenticated, search knowledge base for highly relevant documents
    if (useRAG && req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = require('./middleware/auth').verifyToken(token);
        
        if (decoded) {
          // Get user's documents from database
          const { data: documents, error } = await supabase
            .from('knowledge_base')
            .select('id, content, embedding')
            .eq('user_id', decoded.userId);

          if (!error && documents && documents.length > 0) {
            // Generate embedding for query
            const queryEmbedding = await generateEmbedding(content);

            // Calculate similarity for each document
            const relevantDocs = documents.map(doc => ({
              id: doc.id,
              content: doc.content,
              similarity: vectorStore.cosineSimilarity(queryEmbedding, doc.embedding)
            }))
            .filter(doc => doc.similarity >= 0.5)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, 3);
            
            // Only use RAG if we found highly relevant documents
            if (relevantDocs.length > 0 && relevantDocs[0].similarity >= 0.5) {
              ragContext = '\n\nAdditional Reference (from Knowledge Base):\n' + 
                relevantDocs.map((doc, index) => 
                  `[Reference ${index + 1}] (Relevance: ${(doc.similarity * 100).toFixed(0)}%): ${doc.content}`
                ).join('\n\n');
              enhancedContent = content + ragContext;
              ragUsed = true;
              ragDocumentsCount = relevantDocs.length;
            }
          }
        }
      } catch (ragError) {
        console.error('RAG search failed, proceeding without RAG:', ragError.message);
      }
    }

    // Generate difficulty-specific prompt
    const difficultyInstructions = {
      1: language === 'zh' ? '生成基础、直截了当的问题，测试基本理解。' : 'Generate basic, straightforward questions that test fundamental understanding.',
      2: language === 'zh' ? '生成需要对概念有良好理解的问题。' : 'Generate questions that require a good understanding of the concepts.',
      3: language === 'zh' ? '生成具有挑战性的问题，需要分析思维。' : 'Generate moderately challenging questions that require analytical thinking.',
      4: language === 'zh' ? '生成具有挑战性的问题，需要深入分析和应用。' : 'Generate challenging questions that require deep analysis and application.',
      5: language === 'zh' ? '生成专家级问题，需要批判性思维和复杂概念的综合。' : 'Generate expert-level questions that require critical thinking and synthesis of complex concepts.'
    };

    const languagePrompt = language === 'zh' ? '请用中文生成' : 'Generate in English';

    // Build weakness context for weighting (higher priority for quiz)
    let weaknessContext = '';
    if (userWeaknesses.length > 0) {
      const weaknessList = userWeaknesses.map(w => 
        `- ${w.weakness_description} (priority: HIGH - weight: ${w.weight})`
      ).join('\n');
      weaknessContext = `
      
CRITICAL - HIGHEST PRIORITY: The user has identified the following weaknesses in this topic. These areas need extra attention. At least 2 out of 3 questions MUST focus on these weakness areas. This is more important than general content coverage:
${weaknessList}`;
    }

    // Build suggestion context for weighting (lower priority for quiz)
    let suggestionContext = '';
    if (userSuggestions.length > 0) {
      const suggestionList = userSuggestions.map(s => 
        `- ${s.suggestion_description} (priority: MEDIUM - weight: ${s.weight})`
      ).join('\n');
      suggestionContext = `
      
SECONDARY PRIORITY: The user has received the following improvement suggestions. Use these to guide the question difficulty and content depth, but prioritize weaknesses above all else:
${suggestionList}`;
    }

    const prompt = `${languagePrompt} exactly 3 multiple-choice questions based primarily on the following learning content.
${ragUsed ? 'Use the additional reference material only as supplementary information to enhance the questions.' : ''}
${weaknessContext}
${suggestionContext}

Learning Content:
${content}
${ragContext}

Difficulty Level: ${difficulty}/5
${difficultyInstructions[difficulty]}

Requirements:
- Questions must be strongly related to the learning content
- Each question should have 4 options (A, B, C, D) and indicate the correct answer
- If reference material is provided, use it to add depth to the questions but don't deviate from the main topic
- CRITICAL: Weaknesses have HIGHEST priority - ensure at least 2 out of 3 questions focus on weakness areas, even if it means less coverage of other topics
- Suggestions have SECONDARY priority - use them to adjust difficulty but don't let them override weakness focus
- The weighting hierarchy is: Weaknesses (highest) > Suggestions (medium) > General content (lowest)

Please respond with a valid JSON object in this exact format:
{
  "questions": [
    {
      "id": 1,
      "question": "question text",
      "options": {
        "A": "option A",
        "B": "option B",
        "C": "option C",
        "D": "option D"
      },
      "correctAnswer": "A"
    }
  ]
}

Only return the JSON, no additional text.`;

    const text = await generateWithFallback(prompt);

    // Parse JSON response
    const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
    const quizData = JSON.parse(cleanedText);

    // Include metadata in response
    res.json({
      ...quizData,
      ragUsed,
      ragDocumentsCount,
      difficulty
    });
  } catch (error) {
    console.error('Error generating quiz:', error);
    res.status(500).json({ error: 'Failed to generate quiz', details: error.message });
  }
});

// API: Evaluate Answers
app.post('/api/evaluate', async (req, res) => {
  try {
    const { questions, userAnswers, content, topic } = req.body;

    if (!questions || !userAnswers) {
      return res.status(400).json({ error: 'Questions and user answers are required' });
    }

    // Auto-detect language from content
    const language = detectLanguage(content);

    // Calculate results locally
    const results = questions.map(question => ({
      question: question.question,
      userAnswer: userAnswers[question.id],
      correctAnswer: question.correctAnswer,
      correct: userAnswers[question.id] === question.correctAnswer
    }));

    const correctAnswers = results.filter(r => r.correct).length;
    const score = Math.round((correctAnswers / questions.length) * 100);

    // Generate explanations for each question
    const explanations = await Promise.all(questions.map(async (question) => {
      const languagePrompt = language === 'zh' ? '请用中文解释' : 'Explain in English';
      const prompt = `${languagePrompt} 为什么这个答案是正确的。

题目: ${question.question}
正确答案: ${question.correctAnswer}
选项: ${JSON.stringify(question.options)}

请提供简短清晰的解释，说明为什么这个答案是正确的。只返回解释文本，不要其他内容。`;

      try {
        const explanation = await generateWithFallback(prompt);
        return explanation;
      } catch (error) {
        console.error('Error generating explanation:', error);
        return '解释生成失败';
      }
    }));

    // Generate overall feedback using AI
    const languageFeedback = language === 'zh' ? '请用中文提供反馈' : 'Provide feedback in English';
    const prompt = `${languageFeedback} on the user's quiz performance based on the original learning content.

Original Learning Content:
${content}

Questions:
${JSON.stringify(questions, null, 2)}

User Answers:
${JSON.stringify(userAnswers, null, 2)}

Score: ${score}/100

Please provide detailed feedback on the user's performance and suggestions for improvement.
Only return the feedback text, no additional text.`;

    const feedback = await generateWithFallback(prompt);

    // Generate strengths and weaknesses summary
    const languageSummary = language === 'zh' ? '请用中文总结' : 'Summarize in English';
    
    // Get learning plan context for suggestions
    let learningPlanContext = '';
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = require('./middleware/auth').verifyToken(token);
        
        if (decoded) {
          const { data: currentPlan } = await supabase
            .from('learning_plans')
            .select('*')
            .eq('user_id', decoded.userId)
            .eq('topic', topic)
            .single();

          console.log('Learning plan data:', currentPlan);

          if (currentPlan) {
            const plan = JSON.parse(currentPlan.plan_content);
            learningPlanContext = `\n\nLearning Plan Context:\nCurrent Progress: ${currentPlan.completed_steps}/${currentPlan.total_steps} steps completed\n\nLearning Steps:\n${plan.map((step, index) => {
              const status = index < currentPlan.completed_steps ? '✓ Completed' : '○ Pending';
              return `${status} Step ${step.step}: ${step.title} - ${step.description}`;
            }).join('\n')}`;
            console.log('Learning plan context:', learningPlanContext);
          } else {
            console.log('No learning plan found for topic:', topic);
          }
        }
      } catch (error) {
        console.error('Error fetching learning plan for context:', error);
      }
    }
    
    const summaryPrompt = `${languageSummary} the user's performance by identifying their strengths and weaknesses. IMPORTANT: Use the same language as the learning plan steps shown above.

Score: ${score}/100
Correct Answers: ${correctAnswers}/${questions.length}

Questions and Answers:
${results.map((r, i) => {
  const questionText = questions[i]?.question || '';
  const userAnswer = questions[i]?.options?.[r.userAnswer] || r.userAnswer;
  const correctAnswer = questions[i]?.options?.[r.correctAnswer] || r.correctAnswer;
  return `Question ${i + 1}: ${r.correct ? 'Correct' : 'Wrong'}
Question: ${questionText}
Your answer: ${userAnswer}
Correct answer: ${correctAnswer}`;
}).join('\n\n')}
${learningPlanContext}

Please provide:
1. Strengths (specific topics or question types they answered correctly)
2. Weaknesses (specific topics or question types they got wrong)
3. Specific, actionable suggestions (concrete steps to improve, not generic advice)

IMPORTANT: Make suggestions specific and actionable. For example:
- Instead of "study more", say "review the concept of X as shown in question Y"
- Instead of "pay attention", say "focus on understanding the relationship between A and B"
- Instead of "practice more", say "work on questions related to [specific topic]"
- CRITICAL: Compare the user's weaknesses with the learning plan steps shown above
- Identify which specific learning plan steps the user needs to strengthen based on their quiz performance
- When suggesting to focus on a learning plan step, include the step number in EXACT format: "Step X: [step title]" where X is the step number
- Example: "Based on your weakness in algebra, focus on Step 3: Basic Algebra Concepts to improve your understanding"
- Make sure to include step references for ALL suggestions that relate to learning plan steps

Format the response as:
Strengths:
- [specific strength 1]
- [specific strength 2]

Weaknesses:
- [specific weakness 1]
- [specific weakness 2]

Suggestions:
- [specific, actionable suggestion 1 - MUST include "Step X: [step title]" for relevant learning plan steps]
- [specific, actionable suggestion 2 - MUST include "Step X: [step title]" for relevant learning plan steps]

Only return the summary, no additional text.`;

    const summary = await generateWithFallback(summaryPrompt);

    // Update learning progress based on quiz score
    console.log('Checking for authorization header...');
    console.log('Authorization header present:', !!req.headers.authorization);
    
    if (req.headers.authorization) {
      console.log('Authorization header found, attempting to verify token...');
      try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = require('./middleware/auth').verifyToken(token);
        console.log('Token verified successfully, user ID:', decoded.userId);
        
        if (decoded) {
          // Get current learning plan
          const { data: currentPlan } = await supabase
            .from('learning_plans')
            .select('*')
            .eq('user_id', decoded.userId)
            .eq('topic', topic)
            .single();

          if (currentPlan) {
            const plan = JSON.parse(currentPlan.plan_content);
            console.log('Current plan found:', currentPlan.completed_steps, '/', currentPlan.total_steps, 'steps completed');
            console.log('Plan structure:', JSON.stringify(plan, null, 2));
            
            // Match weaknesses to learning plan steps
            const weaknessesToDowngrade = [];
            // Match strengths to learning plan steps
            const strengthsToUpgrade = [];
            
            if (summary) {
              console.log('Full summary:', summary);
              const weaknessMatch = summary.match(/Weaknesses:(.*?)(?=\n\nSuggestions:|$)/s);
              const strengthMatch = summary.match(/Strengths:(.*?)(?=\n\nWeaknesses:|$)/s);
              const suggestionsMatch = summary.match(/Suggestions:(.*?)$/s);
              
              console.log('Weakness match:', weaknessMatch ? 'Found' : 'Not found');
              console.log('Strength match:', strengthMatch ? 'Found' : 'Not found');
              console.log('Suggestions match:', suggestionsMatch ? 'Found' : 'Not found');
              
              if (weaknessMatch) {
                const weaknessText = weaknessMatch[1];
                console.log('Weakness text:', weaknessText);
                plan.forEach((step, index) => {
                  const weaknessLower = weaknessText.toLowerCase();
                  
                  // Check if step number is mentioned (e.g., "step 1", "Step 1")
                  const stepNumberMatch = weaknessLower.includes(`step ${step.step}`) || weaknessLower.includes(`Step ${step.step}`);
                  
                  // Check if step title words are mentioned
                  const stepWords = step.title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
                  const titleMatch = stepWords.some(word => weaknessLower.includes(word));
                  
                  // Check if step description words are mentioned
                  const descWords = step.description.toLowerCase().split(/\s+/).filter(w => w.length > 3);
                  const descMatch = descWords.some(word => weaknessLower.includes(word));
                  
                  const hasMatch = stepNumberMatch || titleMatch || descMatch;
                  
                  if (hasMatch && index < currentPlan.completed_steps) {
                    weaknessesToDowngrade.push(index);
                    console.log(`Weakness matched step ${index}: ${step.title} (number: ${stepNumberMatch}, title: ${titleMatch}, desc: ${descMatch})`);
                  }
                });
              }
              
              if (strengthMatch) {
                const strengthText = strengthMatch[1];
                console.log('Strength text:', strengthText);
                plan.forEach((step, index) => {
                  const strengthLower = strengthText.toLowerCase();
                  
                  // Check if step number is mentioned (e.g., "step 1", "Step 1")
                  const stepNumberMatch = strengthLower.includes(`step ${step.step}`) || strengthLower.includes(`Step ${step.step}`);
                  
                  // Check if step title words are mentioned
                  const stepWords = step.title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
                  const titleMatch = stepWords.some(word => strengthLower.includes(word));
                  
                  // Check if step description words are mentioned
                  const descWords = step.description.toLowerCase().split(/\s+/).filter(w => w.length > 3);
                  const descMatch = descWords.some(word => strengthLower.includes(word));
                  
                  const hasMatch = stepNumberMatch || titleMatch || descMatch;
                  
                  if (hasMatch && index >= currentPlan.completed_steps) {
                    strengthsToUpgrade.push(index);
                    console.log(`Strength matched step ${index}: ${step.title} (number: ${stepNumberMatch}, title: ${titleMatch}, desc: ${descMatch})`);
                  }
                });
              }
              
              // Also check suggestions section for step references to downgrade
              if (suggestionsMatch) {
                const suggestionsText = suggestionsMatch[1];
                console.log('Suggestions text:', suggestionsText);
                plan.forEach((step, index) => {
                  const suggestionsLower = suggestionsText.toLowerCase();
                  
                  // Only check if step number is mentioned in suggestions (exact format "Step X:")
                  const stepNumberMatch = suggestionsLower.includes(`step ${step.step}:`) || suggestionsLower.includes(`step ${step.step} `);
                  
                  if (stepNumberMatch && index < currentPlan.completed_steps) {
                    if (!weaknessesToDowngrade.includes(index)) {
                      weaknessesToDowngrade.push(index);
                      console.log(`Suggestion matched step ${index} for downgrade: ${step.title} (number: ${stepNumberMatch})`);
                    }
                  }
                });
              }
            }

            console.log('Weaknesses to downgrade:', weaknessesToDowngrade);
            console.log('Strengths to upgrade:', strengthsToUpgrade);

            // If specific steps need to be downgraded based on weaknesses
            if (weaknessesToDowngrade.length > 0) {
              const minDowngradeIndex = Math.min(...weaknessesToDowngrade);
              const newCompletedSteps = Math.max(0, minDowngradeIndex);
              const newProgressPercentage = Math.round((newCompletedSteps / currentPlan.total_steps) * 100);

              console.log('Downgrading progress from', currentPlan.completed_steps, 'to', newCompletedSteps);
              
              await supabase
                .from('learning_plans')
                .update({
                  completed_steps: newCompletedSteps,
                  progress_percentage: newProgressPercentage,
                  updated_at: new Date().toISOString()
                })
                .eq('user_id', decoded.userId)
                .eq('topic', topic);
            } 
            // If specific steps need to be upgraded based on strengths
            else if (strengthsToUpgrade.length > 0) {
              const maxUpgradeIndex = Math.max(...strengthsToUpgrade);
              const newCompletedSteps = Math.min(currentPlan.total_steps, maxUpgradeIndex + 1);
              const newProgressPercentage = Math.round((newCompletedSteps / currentPlan.total_steps) * 100);

              console.log('Upgrading progress from', currentPlan.completed_steps, 'to', newCompletedSteps);
              
              await supabase
                .from('learning_plans')
                .update({
                  completed_steps: newCompletedSteps,
                  progress_percentage: newProgressPercentage,
                  updated_at: new Date().toISOString()
                })
                .eq('user_id', decoded.userId)
                .eq('topic', topic);
            }
            else {
              console.log('No step matches found, not updating progress');
            }
            // If no specific step matches, do not update progress
          }
        }
      } catch (error) {
        console.error('Error updating learning progress:', error);
        // Don't fail the request if progress update fails
      }
    }

    res.json({
      results,
      score,
      feedback,
      explanations,
      summary
    });
  } catch (error) {
    console.error('Error evaluating answers:', error);
    res.status(500).json({ error: 'Failed to evaluate answers', details: error.message });
  }
});

// API: Save user weaknesses
app.post('/api/user-weaknesses', authenticateToken, async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const decoded = require('./middleware/auth').verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { topic, weaknesses } = req.body;

    if (!topic || !weaknesses || !Array.isArray(weaknesses)) {
      return res.status(400).json({ error: 'Topic and weaknesses array are required' });
    }

    // Save each weakness
    for (const weakness of weaknesses) {
      const { description, weight = 1 } = weakness;

      const { data, error } = await supabase
        .from('user_weaknesses')
        .upsert({
          user_id: decoded.userId,
          topic,
          weakness_description: description,
          weight,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,topic,weakness_description'
        });

      if (error) {
        console.error('Error saving weakness:', error);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error saving weaknesses:', error);
    res.status(500).json({ error: 'Failed to save weaknesses', details: error.message });
  }
});

// API: Save user suggestions
app.post('/api/user-suggestions', authenticateToken, async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const decoded = require('./middleware/auth').verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { topic, suggestions } = req.body;

    if (!topic || !suggestions || !Array.isArray(suggestions)) {
      return res.status(400).json({ error: 'Topic and suggestions array are required' });
    }

    // Save each suggestion
    for (const suggestion of suggestions) {
      const { description, weight = 1 } = suggestion;

      const { data, error } = await supabase
        .from('user_suggestions')
        .upsert({
          user_id: decoded.userId,
          topic,
          suggestion_description: description,
          weight,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,topic,suggestion_description'
        });

      if (error) {
        console.error('Error saving suggestion:', error);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error saving suggestions:', error);
    res.status(500).json({ error: 'Failed to save suggestions', details: error.message });
  }
});

// API: Get user weaknesses for a topic
app.get('/api/user-weaknesses', authenticateToken, async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const decoded = require('./middleware/auth').verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { topic } = req.query;

    let query = supabase
      .from('user_weaknesses')
      .select('*')
      .eq('user_id', decoded.userId);

    if (topic) {
      query = query.eq('topic', topic);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching weaknesses:', error);
      return res.status(500).json({ error: 'Failed to fetch weaknesses' });
    }

    res.json({ weaknesses: data || [] });
  } catch (error) {
    console.error('Error fetching weaknesses:', error);
    res.status(500).json({ error: 'Failed to fetch weaknesses', details: error.message });
  }
});

// API: Get user suggestions for a topic
app.get('/api/user-suggestions', authenticateToken, async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const decoded = require('./middleware/auth').verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { topic } = req.query;

    let query = supabase
      .from('user_suggestions')
      .select('*')
      .eq('user_id', decoded.userId);

    if (topic) {
      query = query.eq('topic', topic);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching suggestions:', error);
      return res.status(500).json({ error: 'Failed to fetch suggestions' });
    }

    res.json({ suggestions: data || [] });
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    res.status(500).json({ error: 'Failed to fetch suggestions', details: error.message });
  }
});

// API: Generate learning plan
app.post('/api/generate-learning-plan', authenticateToken, async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const decoded = require('./middleware/auth').verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { content, topic = 'General', weaknesses = [], suggestions = [] } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Auto-detect language from content
    const language = detectLanguage(content);

    // Fetch user weaknesses and suggestions if not provided
    let userWeaknesses = weaknesses;
    let userSuggestions = suggestions;
    
    if (weaknesses.length === 0 || suggestions.length === 0) {
      const { data: fetchedWeaknesses } = await supabase
        .from('user_weaknesses')
        .select('weakness_description, weight')
        .eq('user_id', decoded.userId)
        .eq('topic', topic);

      if (fetchedWeaknesses) {
        userWeaknesses = fetchedWeaknesses.map(w => w.weakness_description);
      }

      const { data: fetchedSuggestions } = await supabase
        .from('user_suggestions')
        .select('suggestion_description, weight')
        .eq('user_id', decoded.userId)
        .eq('topic', topic);

      if (fetchedSuggestions) {
        userSuggestions = fetchedSuggestions.map(s => s.suggestion_description);
      }
    }

    const languagePrompt = language === 'zh' ? '请用中文生成' : 'Generate in English';

    const weaknessContext = userWeaknesses.length > 0 
      ? `\n\nUser Weaknesses (need extra attention):\n${userWeaknesses.map(w => `- ${w}`).join('\n')}`
      : '';

    const suggestionContext = userSuggestions.length > 0
      ? `\n\nUser Suggestions (learning priorities):\n${userSuggestions.map(s => `- ${s}`).join('\n')}`
      : '';

    const prompt = `${languagePrompt} a structured learning plan with exactly 10 steps based on the following learning content.
${weaknessContext}
${suggestionContext}

Learning Content:
${content}

Requirements:
- Create exactly 10 learning steps
- Each step should be clear and actionable
- Steps should progress from basic to advanced
- If weaknesses are listed, ensure steps specifically address those areas
- If suggestions are listed, incorporate them into the relevant steps
- Each step should include a brief description of what to learn or practice

Please respond with a valid JSON object in this exact format:
{
  "plan": [
    {
      "step": 1,
      "title": "step title",
      "description": "what to learn or practice in this step"
    }
  ]
}

Only return the JSON, no additional text.`;

    const text = await generateWithFallback(prompt);

    // Parse JSON response
    const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
    const planData = JSON.parse(cleanedText);

    // Save learning plan to database
    const { data, error } = await supabase
      .from('learning_plans')
      .upsert({
        user_id: decoded.userId,
        topic,
        plan_content: JSON.stringify(planData.plan),
        total_steps: 10,
        completed_steps: 0,
        progress_percentage: 0,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,topic'
      });

    if (error) {
      console.error('Error saving learning plan:', error);
      return res.status(500).json({ error: 'Failed to save learning plan', details: error.message });
    }

    res.json({
      plan: planData.plan,
      total_steps: 10,
      completed_steps: 0,
      progress_percentage: 0
    });
  } catch (error) {
    console.error('Error generating learning plan:', error);
    res.status(500).json({ error: 'Failed to generate learning plan', details: error.message });
  }
});

// API: Get learning plan
app.get('/api/learning-plan', authenticateToken, async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const decoded = require('./middleware/auth').verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { topic } = req.query;

    const { data, error } = await supabase
      .from('learning_plans')
      .select('*')
      .eq('user_id', decoded.userId)
      .eq('topic', topic)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No learning plan found
        return res.json({ plan: null });
      }
      console.error('Error fetching learning plan:', error);
      return res.status(500).json({ error: 'Failed to fetch learning plan' });
    }

    const plan = JSON.parse(data.plan_content);

    res.json({
      plan,
      total_steps: data.total_steps,
      completed_steps: data.completed_steps,
      progress_percentage: data.progress_percentage
    });
  } catch (error) {
    console.error('Error fetching learning plan:', error);
    res.status(500).json({ error: 'Failed to fetch learning plan', details: error.message });
  }
});

// API: Update learning progress
app.post('/api/learning-progress', authenticateToken, async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const decoded = require('./middleware/auth').verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { topic, completed_steps, progress_percentage } = req.body;

    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    const { data, error } = await supabase
      .from('learning_plans')
      .update({
        completed_steps,
        progress_percentage,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', decoded.userId)
      .eq('topic', topic)
      .select();

    if (error) {
      console.error('Error updating learning progress:', error);
      return res.status(500).json({ error: 'Failed to update learning progress' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating learning progress:', error);
    res.status(500).json({ error: 'Failed to update learning progress', details: error.message });
  }
});

// API: Add document to knowledge base
app.post('/api/knowledge-base', authenticateToken, async (req, res) => {
  try {
    const { title, content, metadata = {} } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    // Generate embedding
    const embedding = await generateEmbedding(content);

    // Insert into Supabase
    const { data, error } = await supabase
      .from('knowledge_base')
      .insert([
        {
          user_id: req.user.userId,
          title,
          content,
          embedding,
          metadata
        }
      ])
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ 
      success: true, 
      id: data.id, 
      message: 'Document added to knowledge base' 
    });
  } catch (error) {
    console.error('Error adding document to knowledge base:', error);
    res.status(500).json({ error: 'Failed to add document', details: error.message });
  }
});

// API: List all documents in knowledge base
app.get('/api/knowledge-base', authenticateToken, async (req, res) => {
  try {
    const { data: documents, error } = await supabase
      .from('knowledge_base')
      .select('id, title, content, metadata, created_at')
      .eq('user_id', req.user.userId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ 
      count: documents.length,
      documents: documents.map(doc => ({
        id: doc.id,
        title: doc.title,
        content: doc.content,
        metadata: doc.metadata,
        timestamp: doc.created_at
      }))
    });
  } catch (error) {
    console.error('Error listing knowledge base:', error);
    res.status(500).json({ error: 'Failed to list documents', details: error.message });
  }
});

// API: Delete document from knowledge base
app.delete('/api/knowledge-base/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('knowledge_base')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.userId);
    
    if (error) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({ success: true, message: 'Document deleted' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document', details: error.message });
  }
});

// API: Update document in knowledge base
app.put('/api/knowledge-base/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, metadata = {} } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    // Generate new embedding
    const embedding = await generateEmbedding(content);

    const { data, error } = await supabase
      .from('knowledge_base')
      .update({
        title,
        content,
        embedding,
        metadata,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', req.user.userId)
      .select()
      .single();

    if (error) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({ 
      success: true, 
      id: data.id, 
      message: 'Document updated successfully' 
    });
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ error: 'Failed to update document', details: error.message });
  }
});

// API: Clear all knowledge base
app.delete('/api/knowledge-base', authenticateToken, async (req, res) => {
  try {
    const { error } = await supabase
      .from('knowledge_base')
      .delete()
      .eq('user_id', req.user.userId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ success: true, message: 'Knowledge base cleared' });
  } catch (error) {
    console.error('Error clearing knowledge base:', error);
    res.status(500).json({ error: 'Failed to clear knowledge base', details: error.message });
  }
});

// API: Search knowledge base
app.post('/api/knowledge-base/search', authenticateToken, async (req, res) => {
  try {
    const { query, topK = 3, minScore = 0.5 } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // Get user's documents from database
    const { data: documents, error } = await supabase
      .from('knowledge_base')
      .select('id, content, embedding')
      .eq('user_id', req.user.userId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Generate embedding for query
    const queryEmbedding = await generateEmbedding(query);

    // Calculate similarity for each document
    const results = documents.map(doc => ({
      id: doc.id,
      content: doc.content,
      similarity: vectorStore.cosineSimilarity(queryEmbedding, doc.embedding)
    }))
    .filter(doc => doc.similarity >= minScore)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);

    res.json({ 
      query,
      count: results.length,
      results 
    });
  } catch (error) {
    console.error('Error searching knowledge base:', error);
    res.status(500).json({ error: 'Failed to search', details: error.message });
  }
});

// API: Save quiz result and update progress
app.post('/api/quiz-results', authenticateToken, async (req, res) => {
  try {
    const { topic, difficulty, score, totalQuestions, correctAnswers, timeTaken, content } = req.body;

    if (!topic || score === undefined || !totalQuestions || !content) {
      return res.status(400).json({ error: 'Topic, score, total questions, and content are required' });
    }

    // Insert quiz result
    const { data: quizResult, error: quizError } = await supabase
      .from('quiz_results')
      .insert([
        {
          user_id: req.user.userId,
          topic,
          difficulty: difficulty || 1,
          score,
          total_questions: totalQuestions,
          correct_answers: correctAnswers,
          time_taken: timeTaken,
          content
        }
      ])
      .select()
      .single();

    if (quizError) {
      return res.status(400).json({ error: quizError.message });
    }

    // Calculate new difficulty based on score
    let newDifficulty = difficulty || 1;
    if (score >= 80) {
      newDifficulty = Math.min(5, newDifficulty + 1);
    } else if (score < 60 && newDifficulty > 1) {
      newDifficulty = Math.max(1, newDifficulty - 1);
    }

    // Update or create user progress
    const { data: existingProgress } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', req.user.userId)
      .eq('topic', topic)
      .single();

    let updatedProgress;
    if (existingProgress) {
      // Update existing progress
      const totalQuizzes = existingProgress.total_quizzes + 1;
      const averageScore = Math.round(
        (existingProgress.average_score * existingProgress.total_quizzes + score) / totalQuizzes
      );

      const { data, error: updateError } = await supabase
        .from('user_progress')
        .update({
          current_difficulty: newDifficulty,
          total_quizzes: totalQuizzes,
          average_score: averageScore,
          last_quiz_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existingProgress.id)
        .select()
        .single();

      if (updateError) {
        return res.status(400).json({ error: updateError.message });
      }
      updatedProgress = data;
    } else {
      // Create new progress
      const { data, error: insertError } = await supabase
        .from('user_progress')
        .insert([
          {
            user_id: req.user.userId,
            topic,
            current_difficulty: newDifficulty,
            total_quizzes: 1,
            average_score: score,
            last_quiz_date: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (insertError) {
        return res.status(400).json({ error: insertError.message });
      }
      updatedProgress = data;
    }

    res.json({ 
      success: true,
      quizResult,
      progress: updatedProgress,
      newDifficulty
    });
  } catch (error) {
    console.error('Error saving quiz result:', error);
    res.status(500).json({ error: 'Failed to save quiz result', details: error.message });
  }
});

// API: Get user progress
app.get('/api/user-progress', authenticateToken, async (req, res) => {
  try {
    const { topic } = req.query;

    let query = supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', req.user.userId);

    if (topic) {
      query = query.eq('topic', topic);
    }

    const { data: progress, error } = await query.order('last_quiz_date', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ progress });
  } catch (error) {
    console.error('Error getting user progress:', error);
    res.status(500).json({ error: 'Failed to get user progress', details: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'AI Education Backend is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
