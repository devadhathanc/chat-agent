import fs from 'fs';
import path from 'path';
import { ChatMessage, EpisodicSnapshot } from '../types.js';

export class EventLedger {
  private eventsFilePath: string;
  private seedFilePath: string;
  private messages: ChatMessage[] = [];
  private snapshots: EpisodicSnapshot[] = [];

  constructor(dataDir: string = path.resolve(process.cwd(), 'data')) {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.eventsFilePath = path.join(dataDir, 'events.jsonl');
    this.seedFilePath = path.join(dataDir, 'seed_history.jsonl');
    this.load();
  }

  /**
   * Reload all events from seed and append-only event file
   */
  public load(): void {
    this.messages = [];
    this.snapshots = [];

    // 1. Load seed history if present
    if (fs.existsSync(this.seedFilePath)) {
      this.readFileLines(this.seedFilePath);
    }

    // 2. Load mutable events file
    if (fs.existsSync(this.eventsFilePath)) {
      this.readFileLines(this.eventsFilePath);
    }

    // Sort chronologically
    this.messages.sort((a, b) => a.timestamp - b.timestamp);
    this.snapshots.sort((a, b) => a.timestamp - b.timestamp);
  }

  private readFileLines(filePath: string): void {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim().length > 0);
    for (const line of lines) {
      try {
        const item = JSON.parse(line);
        if (item.type === 'snapshot') {
          this.snapshots.push(item.data);
        } else if (item.role && item.content) {
          this.messages.push(item);
        }
      } catch (err) {
        console.error(`Error parsing line in ${filePath}:`, err);
      }
    }
  }

  /**
   * Append a new message to the immutable log
   */
  public appendMessage(message: ChatMessage): void {
    this.messages.push(message);
    const line = JSON.stringify(message) + '\n';
    fs.appendFileSync(this.eventsFilePath, line, 'utf-8');
  }

  /**
   * Append a structured episodic snapshot
   */
  public appendSnapshot(snapshot: EpisodicSnapshot): void {
    this.snapshots.push(snapshot);
    const line = JSON.stringify({ type: 'snapshot', data: snapshot }) + '\n';
    fs.appendFileSync(this.eventsFilePath, line, 'utf-8');
  }

  /**
   * Project baseline state for a given temporal window [startMs, endMs].
   * Returns relevant structured snapshots and raw messages from that time.
   */
  public projectStateAt(startMs: number, endMs: number): {
    snapshots: EpisodicSnapshot[];
    messages: ChatMessage[];
  } {
    const matchedSnapshots = this.snapshots.filter(
      s => s.timestamp >= startMs && s.timestamp <= endMs
    );

    const matchedMessages = this.messages.filter(
      m => m.timestamp >= startMs && m.timestamp <= endMs
    );

    return {
      snapshots: matchedSnapshots,
      messages: matchedMessages
    };
  }

  /**
   * Get recent messages for an active session
   */
  public getSessionMessages(sessionId: string, limit: number = 20): ChatMessage[] {
    return this.messages
      .filter(m => m.sessionId === sessionId)
      .slice(-limit);
  }

  /**
   * List all unique session IDs with timestamps and summary
   */
  public listSessions(): Array<{ sessionId: string; firstTimestamp: number; lastTimestamp: number; messageCount: number; title: string }> {
    const sessions = new Map<string, { firstTimestamp: number; lastTimestamp: number; messageCount: number; title: string }>();

    for (const msg of this.messages) {
      const existing = sessions.get(msg.sessionId);
      if (!existing) {
        sessions.set(msg.sessionId, {
          firstTimestamp: msg.timestamp,
          lastTimestamp: msg.timestamp,
          messageCount: 1,
          title: msg.content.slice(0, 40) + '...'
        });
      } else {
        existing.lastTimestamp = msg.timestamp;
        existing.messageCount += 1;
      }
    }

    return Array.from(sessions.entries()).map(([sessionId, data]) => ({
      sessionId,
      ...data
    })).sort((a, b) => b.lastTimestamp - a.lastTimestamp);
  }

  /**
   * Reset / clear dynamic events
   */
  public resetDynamicEvents(): void {
    if (fs.existsSync(this.eventsFilePath)) {
      fs.unlinkSync(this.eventsFilePath);
    }
    this.load();
  }
}

