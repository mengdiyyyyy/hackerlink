# HackerLink — Cursor 全栈实现 PRD

> 把 Figma Make 原型变成真实产品的完整指令手册。
> 前端：React (Vite + Tailwind + shadcn/ui) | 后端：Python / FastAPI | 数据库：PostgreSQL + Redis

---

## 一、产品背景（给 Cursor 的上下文）

HackerLink 是一个「黑客松职业社交」产品。核心逻辑：

- 每个用户注册后生成一个 **AI 分身 (Twin)**，分身提炼用户的观点、判断、卡点
- 在黑客松活动中，**分身与其他人的分身自动对话**，判断匹配度
- 用户看到的是「灵魂切片」而非简历：对方的原话、判断、反共识方案
- 匹配成功 → 分身建立对话 → 用户可接管 → 发起线下 Coffee Chat → 写入关系网

设计稿已完成 17 个屏幕，**所有 UI 代码已存在**，现在需要：
1. 把 hardcode 数据换成真实 API 调用
2. 实现 FastAPI 后端 + 数据库
3. 接入 AI（Claude API）实现分身对话逻辑

---

## 二、已有的前端屏幕清单（直接复用 Figma Make 导出）

| Screen | 文件路径 | 状态 |
|--------|---------|------|
| WelcomeScreen | onboarding/WelcomeScreen.tsx | ✅ UI 完成 |
| Question1Screen | onboarding/Question1Screen.tsx | ✅ UI 完成 |
| Question4Screen | onboarding/Question4Screen.tsx | ✅ UI 完成 |
| TwinReadyScreen | onboarding/TwinReadyScreen.tsx | ✅ UI 完成 |
| MyTabEmpty | main/MyTabEmpty.tsx | ✅ UI 完成 |
| ChatsTabEmpty | main/ChatsTabEmpty.tsx | ✅ UI 完成 |
| ExploreModal | main/ExploreModal.tsx | ✅ UI 完成 |
| TwinDepartureTransition | main/TwinDepartureTransition.tsx | ✅ UI 完成 |
| SoulSliceGrid | main/SoulSliceGrid.tsx | ✅ UI 完成 |
| SoulSliceDetail | main/SoulSliceDetail.tsx | ✅ UI 完成 |
| SoulSliceGridWithSelection | main/SoulSliceGridWithSelection.tsx | ✅ UI 完成 |
| MessagesTab | main/MessagesTab.tsx | ✅ UI 完成 |
| TwinChatConversation | main/TwinChatConversation.tsx | ✅ UI 完成 |
| MeetOfflineInvitation | main/MeetOfflineInvitation.tsx | ✅ UI 完成 |
| MeetingInvitationReceiver | main/MeetingInvitationReceiver.tsx | ✅ UI 完成 |
| PostMeetingFeedback | main/PostMeetingFeedback.tsx | ✅ UI 完成 |
| NetworkTabFirstNode | main/NetworkTabFirstNode.tsx | ✅ UI 完成 |
| NetworkTabWithGraph | main/NetworkTabWithGraph.tsx | ✅ UI 完成 |
| RelationDetailCard | main/RelationDetailCard.tsx | ✅ UI 完成 |

---

## 三、数据模型（PostgreSQL）

```sql
-- 用户表
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codename VARCHAR(50) UNIQUE NOT NULL,  -- @deep_listener_07 风格
  display_name VARCHAR(100),
  avatar_variant INT DEFAULT 1,           -- 1-9，对应几何头像
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI 分身表
CREATE TABLE twins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(50),                       -- Milo, Echo 等分身名字
  -- onboarding 采集的原始内容
  topic_type VARCHAR(50),                 -- 产品观察/职业困惑/行业判断/具体卡点
  topic_content TEXT,                     -- Q1 用户输入
  current_blocker TEXT,                   -- Q4 用户输入（可选）
  -- AI 提炼的结构化内容
  vibe_summary TEXT,                      -- 一句话 vibe
  soul_slices JSONB DEFAULT '[]',         -- [{text, source}] 灵魂切片列表
  taste_tags TEXT[],                      -- [#AI Builder, #voice agent, ...]
  anti_patterns TEXT[],                   -- 讨厌的事情列表
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 黑客松活动表
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,             -- 清客松
  tagline TEXT,                           -- 行胜于言，智起无界
  date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  location TEXT,
  venue_capacity INT,
  status VARCHAR(20) DEFAULT 'upcoming', -- upcoming | active | ended
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 活动参与者（分身注册到活动）
CREATE TABLE event_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id),
  user_id UUID REFERENCES users(id),
  twin_id UUID REFERENCES twins(id),
  -- 用户为这场活动设置的目标
  explore_goals TEXT[],                   -- ['能一起做事的人', '解决你具体卡点的人']
  custom_goal TEXT,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- 分身对话记录（分身之间的 AI 对话）
CREATE TABLE twin_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id),
  twin_a_id UUID REFERENCES twins(id),
  twin_b_id UUID REFERENCES twins(id),
  messages JSONB DEFAULT '[]',            -- [{role, content, timestamp}]
  match_score INT,                        -- 0-100
  match_reasons JSONB,                    -- {resonance, complement, taste}
  soul_slices_extracted JSONB,            -- 从对话中提炼的切片
  status VARCHAR(20) DEFAULT 'in_progress', -- in_progress | completed
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 用户间的聊天（用户接管后的真实对话）
CREATE TABLE user_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  twin_conversation_id UUID REFERENCES twin_conversations(id),
  event_id UUID REFERENCES events(id),
  user_a_id UUID REFERENCES users(id),
  user_b_id UUID REFERENCES users(id),
  messages JSONB DEFAULT '[]',
  -- 当前控制状态
  controller VARCHAR(10) DEFAULT 'twin_a', -- twin_a | twin_b | user_a | user_b
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coffee Chat 邀约
CREATE TABLE meeting_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES user_conversations(id),
  sender_id UUID REFERENCES users(id),
  receiver_id UUID REFERENCES users(id),
  event_id UUID REFERENCES events(id),
  start_time TIME,
  end_time TIME,
  location TEXT,
  twin_suggestion JSONB,                  -- {location, duration_reason, why}
  status VARCHAR(20) DEFAULT 'pending',  -- pending | confirmed | rescheduled | declined
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 关系网
CREATE TABLE relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  contact_id UUID REFERENCES users(id),
  relation_type VARCHAR(20),              -- peer | mentor | business | interest | dormant
  circle VARCHAR(20),                     -- core | potential | dormant
  vibe_description TEXT,
  why_connected JSONB,                    -- {commonGround, complement, tasteMatch}
  timeline JSONB DEFAULT '[]',            -- [{type, date, description}]
  user_tag TEXT,                          -- 用户对对方的自定义标签
  strength_analysis TEXT,                 -- AI 生成的关系强度分析
  last_interaction_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, contact_id)
);

-- 会后反馈
CREATE TABLE meeting_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID REFERENCES meeting_invitations(id),
  user_id UUID REFERENCES users(id),
  worth_level VARCHAR(10),                -- very | maybe | not
  topics TEXT,
  next_steps TEXT[],                      -- [continue, collaborate, feedback, archive]
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 四、FastAPI 后端结构

```
backend/
├── main.py
├── config.py                  # 环境变量
├── database.py                # PostgreSQL 连接 (asyncpg)
├── redis_client.py            # Redis (用于实时状态)
├── routers/
│   ├── auth.py                # 注册/登录（手机号或匿名）
│   ├── twins.py               # 分身 CRUD + AI 生成
│   ├── events.py              # 活动管理
│   ├── explore.py             # 分身出发、匹配、结果
│   ├── conversations.py       # 对话（分身+用户）
│   ├── meetings.py            # Coffee Chat 邀约
│   ├── network.py             # 关系网
│   └── ai.py                  # AI 相关（调用 Claude）
├── services/
│   ├── twin_service.py        # 分身逻辑
│   ├── matching_service.py    # 匹配算法
│   ├── ai_service.py          # Claude API 调用
│   └── notification_service.py
├── models/                    # Pydantic 模型
└── schemas/                   # 请求/响应 schema
```

---

## 五、API 接口清单

### Auth
```
POST /api/auth/register          # 匿名注册，生成 codename
POST /api/auth/login
GET  /api/auth/me
```

### Onboarding & Twin
```
POST /api/twin/onboarding        # 提交 Q1+Q4 答案，触发 AI 生成分身
GET  /api/twin/me                # 获取我的分身信息
PUT  /api/twin/me                # 更新分身
GET  /api/twin/:id               # 获取他人分身（展示 soul slices）
```

**POST /api/twin/onboarding 请求体：**
```json
{
  "topic_type": "产品观察",
  "topic_content": "我最近发现 Cursor 的 multi-file edit...",
  "current_blocker": "我在做 voice agent，延迟一直降不到 300ms"
}
```

**响应：**
```json
{
  "twin": {
    "id": "uuid",
    "name": "Milo",
    "vibe_summary": "在 voice agent 延迟优化上有原创判断的 Builder",
    "soul_slices": [
      {"text": "你被 Cursor 的 multi-file edit 击中...", "source": "taste"},
      {"text": "你卡在 voice agent 延迟问题...", "source": "blocker"}
    ],
    "taste_tags": ["#AI Builder", "#voice agent", "#不爱泛聊"]
  }
}
```

### Events
```
GET  /api/events/active          # 当前进行中的活动
POST /api/events/:id/join        # 加入活动（带 explore_goals）
GET  /api/events/:id/stats       # 活动统计（在场分身数量等）
```

### Explore（核心流程）
```
POST /api/explore/start          # 分身出发，触发后台匹配任务
GET  /api/explore/status         # 查询匹配进度（轮询或 WebSocket）
GET  /api/explore/results        # 获取匹配结果（soul slice 列表，按分数排序）
POST /api/explore/select         # 用户选择想认识的人
```

**POST /api/explore/start 请求体：**
```json
{
  "event_id": "uuid",
  "goals": ["能一起做事的人", "解决你具体卡点的人"],
  "custom_goal": "我想见一个在做 voice agent infra 的人"
}
```

### Conversations
```
GET  /api/conversations          # 消息列表
GET  /api/conversations/:id      # 单个对话详情（含分身对话记录）
POST /api/conversations/:id/takeover   # 用户接管
POST /api/conversations/:id/handback   # 交回分身
POST /api/conversations/:id/messages   # 发送消息（用户控制时）
WS   /ws/conversations/:id             # WebSocket 实时消息
```

### Meetings
```
POST /api/meetings/invite        # 发起 Coffee Chat 邀约
GET  /api/meetings/incoming      # 收到的邀约
PUT  /api/meetings/:id/confirm   # 确认
PUT  /api/meetings/:id/reschedule
PUT  /api/meetings/:id/decline
POST /api/meetings/:id/feedback  # 会后反馈
```

**POST /api/meetings/invite 请求体：**
```json
{
  "conversation_id": "uuid",
  "receiver_id": "uuid",
  "event_id": "uuid",
  "start_time": "18:20",
  "end_time": "18:35",
  "location": "活动二楼咖啡角"
}
```

### Network
```
GET  /api/network                # 我的关系网（含节点坐标）
GET  /api/network/:id            # 单个关系详情
PUT  /api/network/:id            # 更新关系标签/圈层
GET  /api/network/notifications  # 关系动态（Brian 也报名了某活动）
```

---

## 六、AI 服务实现（Claude API）

### 6.1 生成分身 Soul Slices

**Prompt 模板：**
```python
TWIN_GENERATION_PROMPT = """
你是一个帮助用户提炼自我认知的 AI。根据用户的回答，生成以下内容：

用户回答：
- 话题类型：{topic_type}
- 具体内容：{topic_content}
- 当前卡点：{current_blocker}

请生成（JSON 格式）：
1. name: 给分身起一个英文名字（简洁有个性，如 Milo, Echo, Sage）
2. vibe_summary: 一句话概括这个人的核心气质（15字以内，第三人称）
3. soul_slices: 3个灵魂切片，每个包含 text（原话提炼）和 source（taste/judgment/blocker）
4. taste_tags: 3-5个标签，格式 "#xxx"
5. anti_patterns: 2-3个 TA 讨厌的事情

注意：
- soul_slices 要用第二人称（"你..."）
- 语气要像一个真正懂 TA 的朋友在描述 TA
- 不要虚、不要泛，要具体
"""
```

### 6.2 分身对话（匹配阶段）

**分身对话的目标**：两个分身代表各自用户，通过对话判断是否值得认识。

```python
TWIN_CHAT_PROMPT = """
你现在是 {user_name} 的 AI 分身，名叫 {twin_name}。

你的性格和立场：
{soul_slices}

你此次黑客松的目标：
{explore_goals}

你正在和另一个分身聊天。对方的信息：
{other_twin_info}

对话规则：
1. 用第一人称说话，就像 {user_name} 本人在说话
2. 不要装客气，直接进入实质性话题
3. 寻找共鸣点和互补点
4. 每条消息 1-3 句话，不要太长
5. 如果发现强共鸣，可以提议线下见面

当前对话：
{conversation_history}

你的回复：
"""
```

### 6.3 生成匹配报告

```python
MATCH_REPORT_PROMPT = """
根据两个分身的对话，生成匹配报告（JSON 格式）：

分身 A：{twin_a_info}
分身 B：{twin_b_info}
对话记录：{conversation_messages}

生成：
1. match_score: 0-100 的匹配分数
2. resonance: 共鸣点描述（一两句话）
3. complement: 互补点描述（一两句话）
4. soul_slices_of_b: 从对话中提炼出的对方 3 个灵魂切片
5. why_you_two: 一段话，说明这两个人为什么值得认识
6. coffee_chat_suggestion: 建议见面时的切入角度
"""
```

### 6.4 会后关系分析

```python
RELATION_ANALYSIS_PROMPT = """
用户刚刚完成了一次线下 Coffee Chat，请根据以下信息生成关系分析：

两人的分身信息：{twin_a_info} vs {twin_b_info}
分身对话摘要：{twin_conversation_summary}
会后反馈：{meeting_feedback}

生成（JSON 格式）：
1. relation_type: peer | mentor | business | interest | dormant
2. circle: core | potential | dormant
3. strength_analysis: 关系强度分析（2-3句话）
4. why_connected: {commonGround, complement, tasteMatch}
5. reconnect_suggestion: 下次建联建议（具体、可执行）
"""
```

---

## 七、前端改造任务（把 hardcode 换成真实数据）

### 7.1 添加 API Client

```typescript
// src/lib/api.ts
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = {
  async post(path: string, body: any) {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async get(path: string) { ... },
  async put(path: string, body: any) { ... }
};
```

### 7.2 各屏幕改造清单

**Question1Screen.tsx**
- onNext 时调用 `api.post('/api/twin/onboarding', { topic_type, topic_content })` 
- 存储 topic 到 React context/zustand

**Question4Screen.tsx**
- onNext/onSkip 时调用完整 onboarding API
- 显示 loading 状态（分身生成中）

**TwinReadyScreen.tsx**
- 从 API 响应读取真实 soul_slices，替换 hardcode 的 memorySlices
- 显示 AI 生成的真实分身名字

**MyTabEmpty.tsx**
- `GET /api/events/active` 获取当前活动
- `GET /api/twin/me` 获取分身信息
- 显示真实 vibe tags

**ExploreModal.tsx**
- onStart 时调用 `POST /api/explore/start`
- 把 selectedCards 和 customInput 发送给后端

**TwinDepartureTransition.tsx**
- 轮询 `GET /api/explore/status` 替代 setTimeout
- 显示真实「正在探索 X 个分身」数量

**SoulSliceGrid.tsx + SoulSliceGridWithSelection.tsx**
- 从 `GET /api/explore/results` 获取真实匹配数据
- souls 数组从 API 响应渲染

**SoulSliceDetail.tsx**
- 接收 soul id 参数，调用对应的 twin_conversation 数据
- soul_slices 和 why_you_two 从 API 读取

**MessagesTab.tsx**
- `GET /api/conversations` 获取真实对话列表

**TwinChatConversation.tsx**
- WebSocket 连接 `/ws/conversations/:id`
- 接管/交回调用对应 API
- 实时显示分身发送的消息

**MeetOfflineInvitation.tsx**
- 调用 AI 生成会面建议（`POST /api/meetings/suggest`）
- 发送时调用 `POST /api/meetings/invite`

**MeetingInvitationReceiver.tsx**
- 从 WebSocket 或推送接收邀约
- 确认/改时间/婉拒调用对应 API

**PostMeetingFeedback.tsx**
- 提交 `POST /api/meetings/:id/feedback`
- 触发后台 AI 生成关系分析

**NetworkTabWithGraph.tsx + RelationDetailCard.tsx**
- `GET /api/network` 获取关系节点数据
- 节点坐标由后端计算（或前端用 force-directed layout）

---

## 八、状态管理建议

使用 **Zustand** 管理全局状态：

```typescript
// src/stores/useAppStore.ts
interface AppStore {
  // 用户
  user: User | null;
  twin: Twin | null;
  
  // 当前活动
  currentEvent: Event | null;
  
  // Explore 流程
  exploreStatus: 'idle' | 'running' | 'done';
  matchResults: MatchResult[];
  selectedMatches: string[];  // user ids
  
  // 消息
  conversations: Conversation[];
  
  // 关系网
  relations: Relation[];
  
  // Actions
  setUser: (user: User) => void;
  setTwin: (twin: Twin) => void;
  setExploreStatus: (status: string) => void;
  addMatchResult: (result: MatchResult) => void;
  toggleSelectMatch: (userId: string) => void;
}
```

---

## 九、环境变量

**.env（前端）**
```
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
```

**.env（后端）**
```
DATABASE_URL=postgresql+asyncpg://user:password@localhost/hackerlink
REDIS_URL=redis://localhost:6379
ANTHROPIC_API_KEY=sk-ant-...
SECRET_KEY=your-jwt-secret
CORS_ORIGINS=http://localhost:5173
```

---

## 十、实现顺序建议（给 Cursor 的执行顺序）

```
Phase 1 - 地基
├── [ ] FastAPI 项目初始化（main.py + config + database）
├── [ ] PostgreSQL 建表（执行上面的 SQL）
├── [ ] Auth 路由（注册 + JWT）
└── [ ] 前端加 Zustand store + API client

Phase 2 - Onboarding 闭环
├── [ ] POST /api/twin/onboarding（接入 Claude API）
├── [ ] TwinReadyScreen 展示真实分身数据
└── [ ] 存储 soul_slices 到数据库

Phase 3 - Explore 核心流程
├── [ ] POST /api/explore/start（触发后台任务）
├── [ ] 分身对话 AI 逻辑（twin-to-twin chat）
├── [ ] 匹配报告生成
├── [ ] GET /api/explore/results
└── [ ] SoulSliceGrid 接真实数据

Phase 4 - 消息 & Meeting
├── [ ] WebSocket 实时对话
├── [ ] 用户接管/交回逻辑
├── [ ] Coffee Chat 邀约全流程
└── [ ] 会后反馈 → 关系生成

Phase 5 - 关系网
├── [ ] GET /api/network（含节点坐标算法）
├── [ ] AI 生成 strength_analysis 和 reconnect_suggestion
└── [ ] NetworkTabWithGraph 接真实数据
```

---

## 十一、设计规范（给 Cursor 保持一致）

**颜色系统：**
- 主色：`#2563EB`（蓝色）
- 强调：`#D97706`（琥珀色）
- 成功：`#10B981`（绿色）
- 背景：`#FAFAF7`（米白）
- 边框：`#E8E8E5`
- 文字：`#0A0A0A`（主）、`#6B6B70`（次）、`#A8A8AC`（弱）

**字体：**
- 标题：`'Inter Tight', 'PingFang SC', sans-serif`
- 正文：`'Inter', 'PingFang SC', sans-serif`
- 代码/标签：`'JetBrains Mono', 'SF Mono', monospace`
- 引语/vibe：`'Noto Serif SC', serif, italic`

**UI 模式：**
- 所有 vibe/灵魂切片引语 → 琥珀色 + 衬线字体斜体
- 所有系统状态/标签 → `[xxx]` 格式 + mono 字体
- 卡片 → `bg-white border border-[#E8E8E5] rounded-lg`
- 主按钮 → `bg-[#2563EB] text-white rounded-lg py-3.5`

---

## 十二、给 Cursor 的 Prompt 模板

### 初始化后端
```
用 FastAPI + asyncpg 创建 HackerLink 后端。
参考以下数据模型建表：[粘贴上面的 SQL]
创建 main.py，配置 CORS，注册路由。
创建 database.py 使用 asyncpg 连接池。
```

### 实现 Twin Onboarding
```
实现 POST /api/twin/onboarding 接口。
接收 topic_type, topic_content, current_blocker。
调用 Anthropic Claude API（claude-3-5-sonnet），使用以下 prompt 生成分身：
[粘贴 TWIN_GENERATION_PROMPT]
把生成结果存入 twins 表，返回给前端。
同时更新 TwinReadyScreen.tsx，从 API 响应读取真实数据渲染。
```

### 实现分身匹配
```
实现 POST /api/explore/start。
触发后台任务：遍历当前活动的所有其他分身，
用 Claude API 模拟每对分身的对话（10-15轮），
根据对话生成匹配分数和灵魂切片。
用 Redis 存储任务进度，前端轮询 GET /api/explore/status。
```
