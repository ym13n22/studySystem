# AI Education System

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/node.js-18+-green.svg)
![Next.js](https://img.shields.io/badge/next.js-14-black.svg)

一个智能学习系统，基于 AI 生成个性化学习计划、测验和闪卡，帮助用户高效掌握知识。

## ✨ 核心功能

- 🎯 **智能学习计划生成**：基于用户输入内容自动生成结构化学习路径
- 📝 **AI 测验生成**：根据学习内容自动生成选择题，支持难度调整
- 🧠 **智能评分与反馈**：AI 分析答题结果，提供详细的优缺点分析和改进建议
- 📚 **闪卡学习**：基于学习计划生成步骤特定的闪卡，支持翻转学习
- 📊 **进度追踪**：基于测验表现自动调整学习进度，支持降级和升级
- 🔄 **多 API 回退机制**：支持 Gemini、Groq、本地 Ollama 模型
- 🌍 **多语言支持**：自动检测内容语言，支持中英文
- 👤 **用户系统**：完整的用户认证和数据持久化（基于 Supabase）

## 🏗️ 技术栈

### 后端
- **Node.js + Express**：服务器框架
- **Gemini API**：Google Generative AI - 主要 AI 模型
- **Groq API**：备用 AI 模型
- **Ollama**：本地 AI 模型（llama3.2）
- **Supabase**：数据库和用户认证
- **JWT**：用户认证

### 前端
- **Next.js 14**：React 框架
- **React 18**：UI 库
- **Axios**：HTTP 客户端
- **Tailwind CSS**：样式框架

### AI 能力
- **RAG（检索增强生成）**：可选的向量检索功能
- **多轮对话**：支持连续问答
- **自适应难度**：根据用户表现调整题目难度
- **弱点识别**：自动识别用户知识薄弱点并针对性强化

## 📁 项目结构

```
StudySystem/
├── backend/
│   ├── config/               # 配置文件
│   │   └── supabase.js       # Supabase 配置
│   ├── middleware/           # 中间件
│   │   └── auth.js           # JWT 认证
│   ├── rag/                  # RAG 模块
│   │   ├── embeddingService.js
│   │   └── vectorStore.js
│   ├── server.js             # Express 服务器主文件
│   ├── package.json          # 后端依赖配置
│   └── .env                  # 环境变量
├── frontend/
│   ├── pages/                # Next.js 页面
│   │   ├── _app.js           # App 组件
│   │   ├── index.js          # 首页
│   │   ├── learning.js       # 学习页面
│   │   ├── quiz.js           # 测验页面
│   │   └── result.js         # 结果页面
│   ├── styles/               # 样式文件
│   │   └── globals.css       # 全局样式
│   ├── next.config.js        # Next.js 配置
│   └── package.json          # 前端依赖配置
└── README.md                 # 本文档
```

## 🚀 快速开始

### 前置要求

- Node.js 18+
- Gemini API Key（从 https://makersuite.google.com/app/apikey 获取）
- Groq API Key（可选，从 https://console.groq.com 获取）
- Supabase 项目（用于数据库和用户认证）
- Ollama（可选，用于本地 AI 模型）

### 安装步骤

#### 1. 克隆项目

```bash
git clone <your-repo-url>
cd StudySystem
```

#### 2. 配置后端

```bash
cd backend
npm install
```

创建 `.env` 文件：

```env
# AI API Keys
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key

# Server Configuration
PORT=3001

# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
JWT_SECRET=your_jwt_secret

# Ollama Configuration (optional)
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

#### 3. 配置前端

```bash
cd frontend
npm install
```

创建 `.env.local` 文件：

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 运行应用

#### 启动后端服务器

```bash
cd backend
npm start
```

后端将在 http://localhost:3001 运行

#### 启动前端开发服务器

```bash
cd frontend
npm run dev
```

前端将在 http://localhost:3000 运行

#### 快速启动（Windows）

双击项目根目录下的 `start.bat` 文件，将自动：
- 检查并安装依赖
- 启动后端服务器
- 启动前端开发服务器
- 打开浏览器访问 http://localhost:3000

### 可选：安装 Ollama（本地 AI 模型）

```bash
# 下载并安装 Ollama
# https://ollama.com/download

# 拉取模型
ollama pull llama3.2

# 启动 Ollama 服务
ollama serve
```

## 📖 使用指南

### 1. 创建学习计划

1. 访问 http://localhost:3000
2. 注册/登录账户
3. 输入学习内容和主题
4. 系统自动生成 10 步学习计划

### 2. 学习模式

- **Plan Mode**：查看学习计划进度
- **Quiz Mode**：生成测验测试知识掌握情况
- **Flashcard Mode**：使用闪卡强化记忆

### 3. 测验与反馈

1. 选择 Quiz Mode
2. 系统根据当前学习步骤生成测验
3. 完成测验后，AI 分析表现
4. 系统自动调整学习进度（降级/升级）

### 4. 闪卡学习

1. 点击已完成的学习步骤
2. 系统生成步骤特定的闪卡
3. 翻转闪卡查看答案
4. 巩固知识点

## 🔌 API 端点

### 认证端点

#### POST /api/register
注册新用户

#### POST /api/login
用户登录，返回 JWT token

### 学习计划端点

#### POST /api/generate-plan
生成学习计划

**请求体:**
```json
{
  "content": "学习内容",
  "topic": "主题"
}
```

#### GET /api/learning-plan?topic=xxx
获取学习计划

### 测验端点

#### POST /api/generate-quiz
生成测验

**请求体:**
```json
{
  "content": "学习内容",
  "topic": "主题",
  "difficulty": 1,
  "useRAG": false
}
```

#### POST /api/evaluate
评估答案并更新进度

**请求体:**
```json
{
  "questions": [...],
  "userAnswers": {...},
  "content": "学习内容",
  "topic": "主题"
}
```

### 闪卡端点

#### POST /api/generate-flashcards
生成闪卡

**请求体:**
```json
{
  "content": "学习内容",
  "topic": "主题",
  "stepFocus": 1
}
```

### Q&A 端点

#### POST /api/qa
多轮问答

**请求体:**
```json
{
  "content": "学习内容",
  "question": "问题",
  "conversationHistory": [...]
}
```

## 🔧 故障排除

### 常见问题

**问题：生成题目失败**
- 检查 `.env` 文件中的 API Keys 是否正确
- 确认网络连接正常
- 查看 API 配额是否用完

**问题：前端无法连接后端**
- 确认后端服务器正在运行（http://localhost:3001）
- 检查 CORS 配置

**问题：Ollama 连接失败**
- 确认 Ollama 服务正在运行：`ollama serve`
- 检查模型是否已下载：`ollama list`
- 确认端口 11434 可访问

**问题：Supabase 连接失败**
- 检查 Supabase URL 和 ANON KEY 是否正确
- 确认 Supabase 项目已启用
- 检查 RLS 策略配置

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 📮 联系方式

如有问题或建议，请通过以下方式联系：
- 提交 GitHub Issue
- 发送邮件至：[your-email]
