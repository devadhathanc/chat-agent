import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { AgentOrchestrator } from './agent/loop.js';
import { EventLedger } from './memory/ledger.js';
import { WebSearchEngine } from './tools/search.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const ledger = new EventLedger();
const searchEngine = new WebSearchEngine();
const orchestrator = new AgentOrchestrator(ledger, searchEngine);

/**
 * Health check endpoint
 */
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    engine: 'Chronos-Diff Agent',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    hasTavilyKey: Boolean(process.env.TAVILY_API_KEY),
    hasExaKey: Boolean(process.env.EXA_API_KEY)
  });
});

/**
 * List all past sessions from the immutable event ledger
 */
app.get('/api/sessions', (_req: Request, res: Response) => {
  try {
    const sessions = ledger.listSessions();
    res.json({ sessions });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/**
 * Get messages for a given session
 */
app.get('/api/sessions/:id', (req: Request, res: Response) => {
  try {
    const messages = ledger.getSessionMessages(req.params.id, 50);
    res.json({ messages });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/**
 * Reset dynamic events back to clean seed state
 */
app.post('/api/reset', (_req: Request, res: Response) => {
  try {
    ledger.resetDynamicEvents();
    res.json({ success: true, message: 'Dynamic events reset to baseline seed state' });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/**
 * SSE Streaming Chat Endpoint
 */
app.post('/api/chat', async (req: Request, res: Response) => {
  const { sessionId = `session-${Date.now()}`, message, evaluationDate } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required' });
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const sendEvent = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const evalDate = evaluationDate ? new Date(evaluationDate) : new Date();

    await orchestrator.handleTurn(
      sessionId,
      message,
      {
        onStatusUpdate: (status) => sendEvent('status', { status }),
        onSearchQueries: (queries) => sendEvent('search_queries', { queries }),
        onSearchResults: (results) => sendEvent('search_results', { results }),
        onToken: (token) => sendEvent('token', { token })
      },
      evalDate
    );

    sendEvent('done', { success: true });
    res.end();
  } catch (err) {
    console.error('Chat error:', err);
    sendEvent('error', { error: String(err) });
    res.end();
  }
});

app.listen(port, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 Chronos-Diff Agent running on http://localhost:${port}`);
  console.log(`• Model: Google Gemini (${process.env.GEMINI_API_KEY ? 'API Key Detected' : 'Mock/Deterministic Fallback'})`);
  console.log(`• Single Tool: Web Search (${process.env.TAVILY_API_KEY ? 'Tavily' : process.env.EXA_API_KEY ? 'Exa' : 'Offline Grounded Provider'})`);
  console.log(`======================================================\n`);
});

