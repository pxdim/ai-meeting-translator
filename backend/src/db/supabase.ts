// Supabase 資料庫客戶端 - 替代 SQLite

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface Meeting {
  id: string;
  title: string;
  created_at: string;
  duration: number;
  audio_path: string;
  summary?: string;
  action_items?: string[];
}

export interface TranscriptSegment {
  id: string;
  meeting_id: string;
  start_time: number;
  end_time: number;
  text_zh: string;
  text_en: string;
  confidence: number;
  speaker?: string;
  created_at?: string;
}

export class SupabaseDatabase {
  private client: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase URL or Service Key');
    }

    this.client = createClient(supabaseUrl, supabaseKey);
    console.log('[Supabase] Database initialized');
  }

  // === 會議操作 ===

  async createMeeting(meeting: {
    id: string;
    title?: string;
    audioPath: string;
  }): Promise<void> {
    const { error } = await this.client.from('meetings').insert({
      id: meeting.id,
      title: meeting.title || '會議記錄',
      audio_path: meeting.audioPath,
    });

    if (error) {
      console.error('[Supabase] Error creating meeting:', error);
      throw error;
    }
  }

  async getMeeting(id: string): Promise<Meeting | null> {
    const { data, error } = await this.client
      .from('meetings')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('[Supabase] Error getting meeting:', error);
      return null;
    }

    return data;
  }

  async listMeetings(limit = 20, offset = 0): Promise<Meeting[]> {
    const { data, error } = await this.client
      .from('meetings')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[Supabase] Error listing meetings:', error);
      return [];
    }

    return data || [];
  }

  async updateMeeting(
    id: string,
    updates: Partial<Omit<Meeting, 'id' | 'created_at'>>
  ): Promise<void> {
    const updateData: any = {};

    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.duration !== undefined) updateData.duration = updates.duration;
    if (updates.summary !== undefined) updateData.summary = updates.summary;
    if (updates.actionItems !== undefined) updateData.action_items = updates.actionItems;

    const { error } = await this.client
      .from('meetings')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('[Supabase] Error updating meeting:', error);
      throw error;
    }
  }

  async deleteMeeting(id: string): Promise<void> {
    const { error } = await this.client.from('meetings').delete().eq('id', id);

    if (error) {
      console.error('[Supabase] Error deleting meeting:', error);
      throw error;
    }
  }

  // === 逐字稿片段操作 ===

  async addSegment(segment: {
    id: string;
    meetingId: string;
    startTime: number;
    endTime: number;
    textZh: string;
    textEn: string;
    confidence: number;
    speaker?: string;
  }): Promise<void> {
    const { error } = await this.client.from('transcript_segments').insert({
      id: segment.id,
      meeting_id: segment.meetingId,
      start_time: segment.startTime,
      end_time: segment.endTime,
      text_zh: segment.textZh,
      text_en: segment.textEn,
      confidence: segment.confidence,
      speaker: segment.speaker,
    });

    if (error) {
      console.error('[Supabase] Error adding segment:', error);
      throw error;
    }
  }

  async getSegments(meetingId: string): Promise<TranscriptSegment[]> {
    const { data, error } = await this.client
      .from('transcript_segments')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('start_time', { ascending: true });

    if (error) {
      console.error('[Supabase] Error getting segments:', error);
      return [];
    }

    return data || [];
  }

  async getMeetingWithSegments(meetingId: string): Promise<{
    meeting: Meeting | null;
    segments: TranscriptSegment[];
  }> {
    const meeting = await this.getMeeting(meetingId);
    const segments = await this.getSegments(meetingId);

    return { meeting, segments };
  }

  // === 批次操作 ===

  async batchAddSegments(segments: TranscriptSegment[]): Promise<void> {
    const { error } = await this.client
      .from('transcript_segments')
      .insert(segments);

    if (error) {
      console.error('[Supabase] Error batch adding segments:', error);
      throw error;
    }
  }

  // === 搜尋操作 ===

  async searchMeetings(query: string): Promise<Meeting[]> {
    const { data, error } = await this.client
      .from('meetings')
      .select('*')
      .or(`title.ilike.%${query}%,summary.ilike.%${query}%`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Supabase] Error searching meetings:', error);
      return [];
    }

    return data || [];
  }

  // === 統計資訊 ===

  async getStats(): Promise<{
    totalMeetings: number;
    totalDuration: number;
    thisMonthMeetings: number;
  }> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // 總會議數
    const { count: totalMeetings } = await this.client
      .from('meetings')
      .select('*', { count: 'exact', head: true });

    // 總錄音時長
    const { data: durationData } = await this.client
      .from('meetings')
      .select('duration');

    const totalDuration = durationData?.reduce((sum, m) => sum + (m.duration || 0), 0) || 0;

    // 本月會議數
    const { count: thisMonthMeetings } = await this.client
      .from('meetings')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfMonth);

    return {
      totalMeetings: totalMeetings || 0,
      totalDuration,
      thisMonthMeetings: thisMonthMeetings || 0,
    };
  }
}

// 單例模式
let dbInstance: SupabaseDatabase | null = null;

export function getDatabase(): SupabaseDatabase {
  if (!dbInstance) {
    dbInstance = new SupabaseDatabase();
  }
  return dbInstance;
}

// 為了保持向後相容的別名
export { SupabaseDatabase as DatabaseClient };
