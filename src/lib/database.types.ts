// Types des tables Supabase utilisées côté client (miroir de supabase/migrations).
// À régénérer avec `npx supabase gen types typescript --linked` quand le schéma évolue.

export type Goal = 'muscle' | 'strength' | 'fat_loss' | 'fitness';
export type WeightUnit = 'kg' | 'lb';

type Timestamps = {
  created_at: string;
  updated_at: string;
};

export type ProfileRow = Timestamps & {
  id: string;
  first_name: string;
  goal: Goal | null;
  sessions_per_week: number | null;
  weight_unit: WeightUnit;
  default_rest_seconds: number;
  reminders_enabled: boolean;
};

export type BodyWeightRow = Timestamps & {
  id: string;
  user_id: string;
  measured_on: string;
  weight_kg: number;
  deleted_at: string | null;
};

type Table<Row, Required extends keyof Row> = {
  Row: Row;
  Insert: Pick<Row, Required> & Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow, 'id' | 'first_name'>;
      body_weights: Table<BodyWeightRow, 'id' | 'user_id' | 'measured_on' | 'weight_kg'>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      goal: Goal;
    };
    CompositeTypes: Record<string, never>;
  };
};
