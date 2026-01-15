import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private supabase: SupabaseClient;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      console.warn('Supabase credentials not found in env');
      // Initialize with mocks or throw, deciding to just logger warn for now to avoid crash if env missing during dev
      return;
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  getClient(): SupabaseClient {
    if (!this.supabase) {
      throw new Error(
        'Supabase client is not initialized. Please ensure SUPABASE_URL and SUPABASE_KEY are set in your .env file.',
      );
    }
    return this.supabase;
  }
}
