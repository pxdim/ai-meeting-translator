// 資料庫客戶端 - 使用 better-sqlite3

import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class DatabaseClient {
  private db: Database.Database;
  private dbPath: string;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  async initialize(): Promise<void> {
    // 確保資料庫目錄存在
    const { dir } = this.parsePath(this.dbPath);
    await this.ensureDir(dir);

    // 開啟資料庫
    this.db = new Database(this.dbPath);

    // 啟用外鍵約束
    this.db.pragma('foreign_keys = ON');

    // 讀取並執行 schema
    const schemaPath = join(__dirname, 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');
    this.db.exec(schema);

    console.log(`[Database] Initialized at ${this.dbPath}`);
  }

  // === 會議操作 ===

  createMeeting(meeting: {
    id: string;
    title?: string;
    audioPath: string;
  }): void {
    const stmt = this.db.prepare(`
      INSERT INTO meetings (id, title, audio_path)
      VALUES (?, ?, ?)
    `);
    stmt.run(meeting.id, meeting.title || '會議記錄', meeting.audioPath);
  }

  getMeeting(id: string) {
    const stmt = this.db.prepare(`
      SELECT * FROM meetings WHERE id = ?
    `);
    return stmt.get(id);
  }

  listMeetings(limit = 20, offset = 0) {
    const stmt = this.db.prepare(`
      SELECT * FROM meeting_summary
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);
    return stmt.all(limit, offset);
  }

  updateMeeting(id: string, updates: {
    title?: string;
    duration?: number;
    summary?: string;
    actionItems?: string;
  }): void {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.title !== undefined) {
      fields.push('title = ?');
      values.push(updates.title);
    }
    if (updates.duration !== undefined) {
      fields.push('duration = ?');
      values.push(updates.duration);
    }
    if (updates.summary !== undefined) {
      fields.push('summary = ?');
      values.push(updates.summary);
    }
    if (updates.actionItems !== undefined) {
      fields.push('action_items = ?');
      values.push(updates.actionItems);
    }

    if (fields.length === 0) return;

    values.push(id);
    const stmt = this.db.prepare(`
      UPDATE meetings SET ${fields.join(', ')} WHERE id = ?
    `);
    stmt.run(...values);
  }

  deleteMeeting(id: string): void {
    const stmt = this.db.prepare('DELETE FROM meetings WHERE id = ?');
    stmt.run(id);
  }

  // === 逐字稿片段操作 ===

  addSegment(segment: {
    id: string;
    meetingId: string;
    startTime: number;
    endTime: number;
    textZh: string;
    textEn: string;
    confidence: number;
    speaker?: string;
  }): void {
    const stmt = this.db.prepare(`
      INSERT INTO transcript_segments (id, meeting_id, start_time, end_time, text_zh, text_en, confidence, speaker)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      segment.id,
      segment.meetingId,
      segment.startTime,
      segment.endTime,
      segment.textZh,
      segment.textEn,
      segment.confidence,
      segment.speaker || null
    );
  }

  getSegments(meetingId: string) {
    const stmt = this.db.prepare(`
      SELECT * FROM transcript_segments
      WHERE meeting_id = ?
      ORDER BY start_time ASC
    `);
    return stmt.all(meetingId);
  }

  // === 輔助方法 ===

  private parsePath(filePath: string): { dir: string; base: string } {
    const parts = filePath.split(/[/\\]/);
    return {
      dir: parts.slice(0, -1).join('/'),
      base: parts[parts.length - 1]
    };
  }

  private async ensureDir(dir: string): Promise<void> {
    const { mkdir } = await import('fs/promises');
    try {
      await mkdir(dir, { recursive: true });
    } catch (error: any) {
      if (error.code !== 'EEXIST') throw error;
    }
  }

  close(): void {
    this.db.close();
  }
}
