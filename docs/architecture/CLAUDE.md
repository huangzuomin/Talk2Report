# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Start Development Servers
```bash
npm run dev              # Start both API server (port 3001) and Vite frontend (port 5173)
npm run dev:api          # Start only the Express API server on port 3001
npm run dev:vite         # Start only the Vite frontend dev server
```

### Build & Preview
```bash
npm run build            # Production build (outputs to dist/)
npm run preview          # Preview production build locally
```

### Testing API Server
Check API health: `http://localhost:3001/health`

### Deployment
The project is configured for Vercel deployment. See `vercel.json` for API routing configuration.

## Architecture Overview

Talk2Report is an AI-powered year-end report generator using DeepSeek's API. The system employs a multi-agent architecture:

### Multi-Agent Pipeline

1. **Agent A (Interviewer)** - `deepseek-reasoner`
   - Conducts Socratic interviews to extract user achievements
   - Uses reasoning model for intelligent follow-up questions
   - Located in: `src/hooks/useDeepSeek.js` (useInterview hook)

2. **Agent B (Archivist)** - `deepseek-chat`
   - Extracts structured JSON from conversation history
   - Maps to `schema/YearEndSummary.json`
   - Endpoint: `/api/deepseek/agent/archivist`

3. **Agent C (Writers)** - Parallel generation
   - Generates 3 report versions simultaneously
   - Endpoint: `/api/deepseek/agent/writers`

4. **Agent D (Critic)** - `deepseek-chat`
   - Validates logical consistency
   - Triggers rewrite if validation fails
   - Endpoint: `/api/deepseek/agent/critic`

### Server Architecture (Development)

**Two servers run concurrently:**

1. **Express API Server** (`server.js` - port 3001)
   - Handles `/api/deepseek/*` routes
   - Proxies requests to DeepSeek API
   - Requires `DEEPSEEK_API_KEY` in `.env.local`

2. **Vite Dev Server** (port 5173)
   - Serves React frontend
   - Has built-in middleware for `/api/deepseek` routes as fallback (see `vite.config.js` lines 18-149)
   - Proxies `/api/deepseek` requests to Express server at `localhost:3001`

**Important:** If Vite can't connect to the Express server, you'll see `ECONNREFUSED` errors. Restart `npm run dev:api`.

### Production Deployment (Vercel)

In production, Vercel serverless functions handle API routes:
- `/api/deepseek/chat` - Direct proxy to DeepSeek API
- `/api/deepseek/agent/*` - Agent-specific endpoints
- Serverless functions are located in `api/deepseek/*.js`
- CORS headers configured in `vercel.json`

### Key Data Flow

```
User Input → Agent A (Interviewer)
         ↓
Conversation History → Agent B (Archivist)
         ↓
Structured JSON + Preferences → Agent C (Writers)
         ↓
3 Draft Versions → Agent D (Critic)
         ↓
Final Report (or rewrite if failed validation)
```

## Project Structure

```
src/
├── components/          # React components
│   ├── ChatInterface.jsx    # Main interview UI
│   ├── ChatInterfaceV2.jsx  # Enhanced interview UI with slot machine
│   ├── ReportViewer.jsx     # Display generated reports
│   ├── AgentTerminal.jsx    # Shows agent execution logs
│   ├── ThinkingProcess.jsx  # Collapsible AI reasoning display
│   ├── MessageBubble.jsx    # Chat message component
│   ├── InputArea.jsx        # Chat input with send button
│   └── MaterialDashboard.jsx # Material-based dashboard view
├── hooks/
│   ├── useDeepSeek.js       # Core hooks: useInterview, useReportGeneration, useConversationPersistence
│   └── useInterviewMachine.js # State machine for structured interview (slot-based)
├── lib/
│   └── deepseek-client.js   # DeepSeek API client & agent orchestration
├── config/
│   └── ReportState.js       # Interview state machine configuration
├── utils/
│   └── recorder.js          # Audio recording utilities
├── api/
│   └── client.js            # Legacy API client (n8n integration)
├── App.jsx               # Main app with view state management
└── main.jsx              # React entry point

api/deepseek/            # Vercel serverless functions (production)
├── chat.js              # Generic DeepSeek chat proxy
├── agent-archivist.js   # Agent B endpoint
├── agent-writers.js     # Agent C endpoint (parallel writers)
└── agent-critic.js      # Agent D endpoint

prompts/agents/          # Agent system prompts
├── agent_a_interviewer.md
├── agent_b_archivist.md
├── agent_c_writer.md
└── agent_d_critic.md

server.js                # Express API server (development only)
vite.config.js           # Vite config with API route middleware
schema/YearEndSummary.json # Structured data schema for extraction
vercel.json              # Vercel deployment configuration
```

## Environment Configuration

Required in `.env.local`:
```bash
DEEPSEEK_API_KEY=sk-xxx              # Required
DEEPSEEK_API_BASE=https://api.deepseek.com  # Optional
```

Optional (n8n workflow integration):
```bash
# Test URLs (开发测试使用，不需要激活工作流)
N8N_INTERVIEW_URL=https://n8n.neican.ai/webhook-test/interview/next-step
N8N_GENERATE_URL=https://n8n.neican.ai/webhook-test/generate
N8N_AUTH_TOKEN=NeicanSTT2025Secret

# Production URLs (生产环境，需要激活工作流)
# N8N_INTERVIEW_URL=https://n8n.neican.ai/webhook/interview/next-step
# N8N_GENERATE_URL=https://n8n.neican.ai/webhook/generate

# n8n REST API (用于工作流管理，需服务器端访问)
N8N_API_BASE=http://192.168.50.224:30109/api/v1
N8N_API_KEY=your-api-key-here
```

**Important**:
- `/webhook-test/*` = Test URLs (无需激活工作流，用于开发调试)
- `/webhook/*` = Production URLs (必须先激活工作流)
- n8n API Key 仅用于服务器端操作，严禁暴露到前端

**Note:** Environment variables are loaded by both:
- `server.js` (line 13): `dotenv.config({ path: '.env.local' })`
- `vite.config.js` (line 153): `loadEnv(mode, process.cwd(), ['DEEPSEEK_', 'N8N_', ...])`

## Critical Implementation Details

### DeepSeek Reasoner Streaming
- Agent A and D use `deepseek-reasoner` with streaming to show thinking process
- The `reasoning_content` field contains the thinking process (separate from `content`)
- See `src/lib/deepseek-client.js` lines 80-86 for reasoning extraction logic

### Recursive Critic Loop
- If Agent D fails validation (score < 80 or `rewrite_needed === true`), the pipeline recursively calls Agent C
- This continues until validation passes or max iterations reached
- See `src/lib/deepseek-client.js` for orchestration logic

### State Persistence
- App state auto-saves to localStorage (key: `talk2report_v2_state`)
- Includes view, preferences, and conversation history
- See `src/App.jsx` lines 9-52 for persistence logic
- State is automatically loaded on app initialization

### React Hooks Pattern
- `useInterview`: Basic chat interface for Agent A interaction (free-form)
- `useInterviewMachine`: Advanced slot-based interview with state machine (structured)
- `useReportGeneration`: Orchestrates B→C→D pipeline with progress callbacks
- `useConversationPersistence`: Handles localStorage persistence

### Slot-Based Interview Machine
- `useInterviewMachine` implements a state machine with predefined slots
- Slots are defined in `src/config/ReportState.js`
- Process: Extract → Update → Decide → Ask
- Tracks completion percentage based on filled slots

## Agent-Specific Notes

### Agent A (Interviewer)
- Model: `deepseek-reasoner` (shows thinking process)
- Two implementations:
  - `useInterview`: Free-form conversation (see `src/hooks/useDeepSeek.js` lines 14-100)
  - `useInterviewMachine`: Structured slot-based interview (see `src/hooks/useInterviewMachine.js`)
- System prompts located in `prompts/agents/agent_a_interviewer.md`
- First question: "今年最让你感到自豪的三个成就是什么?"
- Must preserve conversation history for context
- Target: 10-15 questions covering 5 topics (achievements, challenges, growth, team, future)

### Agent B (Archivist)
- Model: `deepseek-chat`
- Input: `{ conversation_history, user_profile }`
- Output: Structured JSON matching `schema/YearEndSummary.json`
- System prompt: `prompts/agents/agent_b_archivist.md`
- **Critical**: Only extract explicitly mentioned information
- Numbers/awards must be quoted verbatim
- Serverless function: `api/deepseek/agent-archivist.js`

### Agent C (Writers)
- Model: `deepseek-chat`
- Generates 3 versions in parallel using Promise.all
- System prompt: `prompts/agents/agent_c_writer.md`
- Versions: brief (200 chars), formal (800-1500 chars), social (casual + emojis)
- Uses user preferences (audience, tone, length_main_chars)
- Serverless function: `api/deepseek/agent-writers.js` (streams SSE progress)

### Agent D (Critic)
- Model: `deepseek-reasoner` (validates with reasoning)
- Input: `{ factsheet, drafts }`
- Output: `{ passed, score, verdict, rewrite_needed, issues }`
- System prompt: `prompts/agents/agent_d_critic.md`
- Validates logical consistency, causality, evidence support
- Score threshold: 80/100 (below triggers rewrite)
- Serverless function: `api/deepseek/agent-critic.js`

## Common Issues

### API Server Connection Errors
```
[vite] http proxy error: /api/deepseek/chat
Error: read ECONNRESET
```
**Solution:** Restart the API server: `npm run dev:api`

### DeepSeek API Errors
- Ensure `DEEPSEEK_API_KEY` is set in `.env.local`
- Check API key validity at https://platform.deepseek.com/
- Free tier: 5M tokens for `deepseek-chat`

### Environment Variables Not Loading
- Variables must be prefixed with `DEEPSEEK_` or `N8N_` to load in Vite
- See `vite.config.js` line 153 for the full prefix list
- For client-side access, variables must be explicitly defined (lines 162-166)

## Adding New Agents

1. Create system prompt in `prompts/agents/agent_X_name.md`
2. Create serverless function in `api/deepseek/agent-name.js`
   - Follow the pattern: handle CORS, parse body, call DeepSeek API, return response
   - For streaming agents, use SSE (Server-Sent Events) with `Content-Type: text/event-stream`
3. Add client-side wrapper in `src/lib/deepseek-client.js` if needed
4. Orchestrate in the pipeline functions if part of main flow
5. Update progress callbacks in hooks if UI feedback needed

## UI View States

The app manages different views via state:
- `setup`: Initial configuration (role, audience, tone, length)
- `chat`: Interview interface (either ChatInterface or ChatInterfaceV2)
- `generating`: Shows AgentTerminal with real-time progress
- `result`: ReportViewer with generated reports

## Styling

- **Tailwind CSS**: Primary styling framework (configured in `tailwind.config.js`)
- **Lucide React**: Icon library (import icons from `lucide-react`)
- **CSS Modules**: Additional styles in `src/style.css` (legacy)
- **React Markdown**: Renders markdown content in reports

## Key Files for Quick Reference

| File | Purpose |
|------|---------|
| `src/App.jsx` | Main app, view routing, state persistence |
| `src/hooks/useDeepSeek.js` | Core interview & generation hooks |
| `src/hooks/useInterviewMachine.js` | Slot-based state machine interview |
| `src/lib/deepseek-client.js` | DeepSeek API client & streaming logic |
| `src/config/ReportState.js` | Interview slot definitions |
| `schema/YearEndSummary.json` | Output data schema |
| `vite.config.js` | Dev server config, API proxy, env vars |
| `server.js` | Express dev server (not used in production) |

## n8n Control Contract

Claude may interact with n8n ONLY via the Public REST API.
Strictly forbidden: SSH access, Docker commands, direct database access, or filesystem operations.

### Primary API Base (LAN)
- **N8N_API_BASE** = `http://192.168.50.224:30109/api/v1`
- This is the ONLY default base for Claude Code, scripts, and MCP tools.
- ✅ **Correct paths**: `/api/v1/workflows`, `/api/v1/executions`, `/api/v1/credentials`
- ❌ **Incorrect paths**: `/rest/*`, `/webhook/*`, `/graphql`, `/javascript/`

### External Domain (Production-facing)
- **https://n8n.neican.ai**
- Used for post-launch public webhooks / third-party integrations.
- Claude must NOT assume this endpoint is writable.
- Any write action targeting the external domain requires explicit user confirmation.

### Authentication

#### REST API Authentication
- **Header**: `X-N8N-API-KEY: $N8N_API_KEY`
- `N8N_API_KEY` must be read from environment variables only
- Must be server-side only (never exposed to browser builds)
- **Never** print or log API keys in:
  - Console output
  - Error messages
  - Git commits
  - Generated config files
  - Debug logs

#### Webhook Authentication
- **Header**: `Authorization: Bearer $N8N_AUTH_TOKEN`
- `N8N_AUTH_TOKEN` can be client-side (for webhook calls from frontend)
- Also stored in environment variables

### Allowed Operations

#### Read Operations (No restrictions)
```
GET /api/v1/workflows              # List all workflows
GET /api/v1/workflows/{id}         # Get workflow details
GET /api/v1/executions             # List execution history
GET /api/v1/executions/{id}        # Get execution details
GET /api/v1/credentials            # List credentials (metadata only)
```

#### Write Operations (Restricted)
```
POST /api/v1/workflows             # Create workflow (draft only)
PATCH /api/v1/workflows/{id}       # Update workflow (draft only)
DELETE /api/v1/workflows/{id}      # ❌ FORBIDDEN without explicit user instruction
POST /api/v1/executions            # Trigger manual execution
```

**Restrictions**:
- Creating/updating workflows is allowed ONLY for `dev` or `draft` status
- Activating production workflows is FORBIDDEN without explicit user instruction
- Deleting workflows is FORBIDDEN without explicit user instruction
- Modifying credentials is FORBIDDEN (see Security Red Lines below)

### Mandatory Verification After Any Write

After any `POST` or `PATCH` operation on workflows:

**Step 1: Trigger Test Execution**
```javascript
// Trigger webhook or manual execution
const testRun = await fetch(`${N8N_API_BASE}/executions`, {
  method: 'POST',
  headers: {
    'X-N8N-API-KEY': N8N_API_KEY,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    workflowId: workflowId,
    data: { test: true }
  })
});

const executionId = testRun.data.id;
```

**Step 2: Poll Execution Status**
```javascript
// Poll until completion (max 30 attempts = 30 seconds)
for (let i = 0; i < 30; i++) {
  const status = await fetch(`${N8N_API_BASE}/executions/${executionId}`, {
    headers: { 'X-N8N-API-KEY': N8N_API_KEY }
  });

  const data = await status.json();

  if (data.finished) {
    if (data.status === 'success') {
      console.log('✅ Workflow verification passed');
      break;
    } else if (data.status === 'error') {
      throw new Error(`Workflow failed: ${data.data.result.data.lastNode}`);
    }
  }

  await new Promise(r => setTimeout(r, 1000));
}
```

**Step 3: Error Handling and Iteration**
If verification fails (`status === 'error'`):
1. Extract error details from `execution.data.result.data`
2. Identify the failed node and error message
3. Fix the workflow issue
4. **Retry Steps 1-2** (maximum 3 attempts)
5. If still failing after 3 attempts, abort and report to user

**Forbidden shortcuts**:
- ❌ Skipping test execution after create/update
- ❌ Not checking execution status (only checking HTTP 200)
- ❌ Ignoring error status and proceeding anyway

### Security Red Lines (CRITICAL)

The following operations are **ABSOLUTELY FORBIDDEN** unless user provides **EXPLICIT INSTRUCTION**:

| Operation | Risk Level | Description |
|-----------|------------|-------------|
| SSH to TrueNAS | 🔴 CRITICAL | `ssh user@192.168.50.224` or any SSH commands |
| Docker operations | 🔴 CRITICAL | `docker exec`, `docker compose`, `docker restart`, etc. |
| Modify credentials | 🔴 CRITICAL | POST/PATCH/DELETE on `/api/v1/credentials/*` |
| Activate production workflows | 🔴 CRITICAL | Changing workflow status from `draft` to `active` |
| Delete workflows | 🔴 CRITICAL | `DELETE /api/v1/workflows/{id}` |
| Stop running executions | 🟠 HIGH | Interrupting active production workflows |
| Export workflows with secrets | 🟡 MEDIUM | Downloading full workflow JSON with embedded credentials |

#### What Counts as "Explicit User Instruction"

User must provide **direct, unambiguous command**:

✅ **Acceptable explicit instructions**:
- "激活工作流 interview-workflow"
- "删除工作流 test-workflow-v2"
- "修改 DeepSeek API credential"
- "Allow me to activate the production workflow"

❌ **NOT acceptable (implicit instructions)**:
- "优化工作流" → Does NOT authorize activation
- "修复问题" → Does NOT authorize credential modification
- "部署上线" → Requires secondary confirmation
- "Make it production-ready" → Ambiguous, must clarify

When in doubt, **ask user for confirmation** before proceeding with any red-line operation.

### Error Handling and Logging

#### Safe Logging Practices
```javascript
// ✅ SAFE: No sensitive data
console.log('n8n API request:', {
  endpoint: '/api/v1/workflows',
  method: 'GET',
  hasAuth: !!N8N_API_KEY
});

// ❌ UNSAFE: Exposes API key
console.log('n8n API request:', {
  headers: { 'X-N8N-API-KEY': N8N_API_KEY }
});
```

#### Error Response Handling

| HTTP Status | Meaning | Action |
|------------|---------|--------|
| 401 / 403 | Invalid or missing API key | Prompt user to check `N8N_API_KEY` configuration |
| 404 | Workflow or endpoint not found | Verify workflow ID and API base URL |
| 422 | Validation error | Show n8n error message (without exposing secrets) |
| 500 | n8n internal error | Check n8n logs, report to user |

### Related Files

| File | Purpose |
|------|---------|
| `src/api/client.js` | n8n HTTP API client (legacy, uses webhooks) |
| `.env.local.example` | Environment variable template |
| `docs/N8N_DEPLOYMENT_GUIDE.md` | n8n deployment and setup guide |
| `n8n_workflows/interview_workflow.json` | Agent A workflow definition |
| `n8n_workflows/generate_workflow.json` | Agent B+C+D workflow definition |

## n8n Workflow Automation Protocol

This section defines the rules and protocols for Claude Code to automatically debug, update, and maintain n8n workflows via REST API.

### Core Principles

1. **Read-Modify-Write Pattern**: Always read existing workflow before making changes
2. **Minimal Changes**: Make only the necessary modifications to fix issues
3. **Schema Compliance**: Never add fields outside the n8n workflow schema
4. **Verification Required**: Test every change before considering it complete
5. **Idempotency**: Operations should be repeatable without side effects

### Mandatory Workflow Modification Workflow

When tasked with debugging or updating a workflow:

#### Step 1: Read Current State (REQUIRED)
```javascript
// ALWAYS start by fetching the current workflow
const response = await fetch(`${N8N_API_BASE}/workflows/${workflowId}`, {
  headers: {
    'X-N8N-API-KEY': N8N_API_KEY,
    'Content-Type': 'application/json'
  }
});

if (!response.ok) {
  throw new Error(`Failed to fetch workflow: ${response.status}`);
}

const currentWorkflow = await response.json();
```

**IMPORTANT**: Never skip this step. Always base modifications on the latest version.

#### Step 2: Analyze Workflow Structure
```javascript
// Extract key information
const analysis = {
  name: currentWorkflow.name,
  nodeCount: currentWorkflow.nodes.length,
  nodes: currentWorkflow.nodes.map(n => ({
    name: n.name,
    type: n.type,
    position: n.position
  })),
  connections: currentWorkflow.connections,
  settings: currentWorkflow.settings
};

console.log('Workflow analysis:', JSON.stringify(analysis, null, 2));
```

#### Step 3: Make Minimal Modifications
```javascript
// ✅ CORRECT: Modify specific nodes/connections
const modifiedWorkflow = {
  ...currentWorkflow,  // Preserve all existing data
  nodes: currentWorkflow.nodes.map(node => {
    if (node.name === 'Node To Fix') {
      return {
        ...node,
        parameters: {
          ...node.parameters,
          // Only modify what needs to change
          fixedParameter: 'newValue'
        }
      };
    }
    return node;
  }),
  updatedAt: new Date().toISOString()
};

// ❌ WRONG: Create entirely new workflow
const newWorkflow = {
  name: 'Workflow Name',
  nodes: [ /* entirely new nodes */ ],
  // ... Missing many required fields from original
};
```

**CRITICAL RULES**:
- Preserve all fields from original workflow
- Only modify the specific nodes/connections that need changes
- Never remove metadata fields (id, createdAt, version, etc.)
- Never add arbitrary fields outside n8n schema
- Maintain connection integrity (all referenced nodes must exist)

#### Step 4: Update via PUT API
```javascript
const updateResponse = await fetch(`${N8N_API_BASE}/workflows/${workflowId}`, {
  method: 'PUT',
  headers: {
    'X-N8N-API-KEY': N8N_API_KEY,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(modifiedWorkflow)
});

if (!updateResponse.ok) {
  const error = await updateResponse.text();
  throw new Error(`Failed to update workflow: ${error}`);
}

const updatedWorkflow = await updateResponse.json();
console.log('✅ Workflow updated:', updatedWorkflow.id);
```

**Expected PUT Response Schema**:
```json
{
  "id": "workflow-id",
  "name": "Workflow Name",
  "nodes": [],
  "connections": {},
  "settings": {},
  "staticData": null,
  "tags": [],
  "pinData": null,
  "versionId": "version-uuid"
}
```

**Common PUT Errors**:
- `422 Unprocessable Entity`: Schema validation failed (check for extra fields)
- `404 Not Found`: Workflow ID doesn't exist
- `401 Unauthorized`: Invalid API key

#### Step 5: Verify Changes (MANDATORY)
```javascript
// 5a. Trigger test execution
const testPayload = {
  session_id: "verification-test-" + Date.now(),
  conversation_history: [
    { role: "assistant", content: "Test message" },
    { role: "user", content: "Test response" }
  ],
  preferences: {
    role: "测试角色",
    audience: "leader",
    tone: "formal",
    length_main_chars: 500
  }
};

const webhookUrl = currentWorkflow.nodes.find(
  n => n.type === 'n8n-nodes-base.webhook'
)?.parameters?.path;

if (!webhookUrl) {
  throw new Error('No webhook node found in workflow');
}

const testRun = await fetch(`https://n8n.neican.ai/webhook/${webhookUrl}`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${N8N_AUTH_TOKEN}`
  },
  body: JSON.stringify(testPayload)
});

console.log('Test webhook status:', testRun.status);
console.log('Response length:', testRun.headers.get('content-length'));

// 5b. Check execution logs
const executions = await fetch(
  `${N8N_API_BASE}/executions?workflowId=${workflowId}&limit=1`,
  { headers: { 'X-N8N-API-KEY': N8N_API_KEY } }
);

const executionsData = await executions.json();
const latestExecution = executionsData.data?.[0];

if (latestExecution) {
  console.log('Execution status:', latestExecution.status);
  console.log('Execution finished:', latestExecution.finished);

  if (latestExecution.status === 'error') {
    throw new Error(`Workflow execution failed: ${latestExecution.id}`);
  }
}

// 5c. Verify response data if successful
if (testRun.headers.get('content-length') !== '0') {
  const responseData = await testRun.json();
  console.log('✅ Verification passed - workflow returned data');
  console.log('Response sample:', JSON.stringify(responseData).slice(0, 200));
} else {
  console.warn('⚠️ Warning: Empty response, check execution logs');
}
```

### Common Debugging Scenarios

#### Scenario 1: Fix Node Name in Connection
**Problem**: Connection references non-existent node name
```json
// BEFORE (broken)
"Node A": {
  "main": [[{
    "node": "Wrong Node Name",  // ❌ Node doesn't exist
    "type": "main"
  }]]
}
```

**Solution**:
1. List all node names in workflow
2. Find correct node name
3. Update connection with correct name
```javascript
const nodeNames = workflow.nodes.map(n => n.name);
console.log('Available nodes:', nodeNames);

// Fix connection
workflow.connections = {
  ...workflow.connections,
  'Node A': {
    main: [[{
      node: 'Correct Node Name',  // ✅ Fixed
      type: 'main'
    }]]
  }
};
```

#### Scenario 2: Update Webhook Path
**Problem**: Webhook path needs to be changed
```javascript
const webhookNode = workflow.nodes.find(
  n => n.type === 'n8n-nodes-base.webhook'
);

if (webhookNode) {
  webhookNode.parameters = {
    ...webhookNode.parameters,
    path: 'new-webhook-path',  // ✅ Update path
    responseMode: 'responseNode',
    options: {}
  };
}
```

#### Scenario 3: Add Error Handling Node
**Problem**: Workflow needs error handling
```javascript
// 1. Create error handler node
const errorHandler = {
  name: 'Handle Errors',
  type: 'n8n-nodes-base.respondToWebhook',
  position: [800, 300],
  parameters: {
    respondWith: 'json',
    responseBody: '={{ { "error": "Workflow failed", "message": $json.error } }}'
  }
};

// 2. Add to workflow nodes
workflow.nodes.push(errorHandler);

// 3. Connect error output
workflow.connections['Some Node'] = {
  ...workflow.connections['Some Node'],
  main: [
    workflow.connections['Some Node']?.main?.[0] || [],
    [[{ node: 'Handle Errors', type: 'main' }]]  // Error output
  ]
};
```

### Required Context for Automation

When working with n8n workflows, always have these files available:

1. **Workflow Examples** (for reference):
   - `n8n_workflows/generate_workflow_v3_enhanced.json`
   - `n8n_workflows/interview_workflow.json`

2. **API Documentation** (n8n REST API):
   - GET /workflows/{id} - Fetch workflow
   - PUT /workflows/{id} - Update workflow
   - GET /executions - List executions
   - GET /executions/{id} - Get execution details

3. **Schema Knowledge**:
   - Workflow JSON structure (nodes, connections, settings)
   - Node types and their parameters
   - Connection structure (main, error outputs)

### Forbidden Patterns

❌ **NEVER do these**:

```javascript
// ❌ Don't create workflow from scratch without reading original
const newWorkflow = { name: '...', nodes: [...] };

// ❌ Don't add arbitrary fields
workflow.myCustomField = 'value';

// ❌ Don't remove metadata
delete workflow.id;
delete workflow.createdAt;

// ❌ Don't assume node names exist
connections['Node A'] = [[{ node: 'Node B' }]];  // Node B might not exist

// ❌ Don't skip verification
await updateWorkflow(workflow);  // Missing test execution check
```

✅ **ALWAYS do these**:

```javascript
// ✅ Always read first
const workflow = await getWorkflow(id);

// ✅ Always preserve all fields
const updated = { ...workflow, nodes: modifiedNodes };

// ✅ Always verify node existence
const nodeExists = workflow.nodes.some(n => n.name === 'Target Node');
if (!nodeExists) throw new Error('Target node not found');

// ✅ Always test after update
await updateWorkflow(workflow);
await verifyWorkflow(workflowId);
```

### Testing Commands Reference

```bash
# Test local webhook (development)
node n8n_workflows/tests/debug_request.js

# Check execution logs
node n8n_workflows/tests/check_new_execs.js

# Test DeepSeek API directly
node n8n_workflows/tests/test_deepseek_api.js

# Verify workflow structure
node n8n_workflows/tests/fix_active_workflow.js
```

### Error Recovery

If workflow update fails:

1. **Schema Validation Error (422)**:
   - Check for extra fields not in schema
   - Verify all required fields are present
   - Ensure node types are valid

2. **Node Not Found (404)**:
   - Verify workflow ID is correct
   - Check if workflow was deleted

3. **Connection Reference Error**:
   - List all actual node names
   - Find and fix mismatched references
   - Verify connection structure

4. **Execution Failure**:
   - Fetch execution details via API
   - Identify failed node
   - Check node parameters
   - Fix and retry

### Advanced: Batch Operations

When updating multiple workflows:

```javascript
const workflowIds = ['id1', 'id2', 'id3'];

for (const id of workflowIds) {
  try {
    const workflow = await getWorkflow(id);
    const updated = applyFix(workflow);
    await updateWorkflow(id, updated);
    await verifyWorkflow(id);
    console.log(`✅ Updated workflow ${id}`);
  } catch (error) {
    console.error(`❌ Failed to update ${id}:`, error.message);
    // Continue with next workflow
  }
}
```

**IMPORTANT**: Always process workflows sequentially, not in parallel, to avoid overwhelming the n8n API.
