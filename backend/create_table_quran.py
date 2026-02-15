
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

DATABASE_URL = os.environ.get("DATABASE_URL")

def create_table():
    if not DATABASE_URL:
        print("DATABASE_URL not found")
        return

    conn = None
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        sql = """
        CREATE TABLE IF NOT EXISTS public.quran_reciters (
            id INTEGER PRIMARY KEY,
            name TEXT,
            rewaya TEXT,
            server TEXT,
            letter TEXT,
            category TEXT,
            image TEXT,
            is_active BOOLEAN DEFAULT true,
            featured BOOLEAN DEFAULT false,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
        );
        
        -- Add index for search
        CREATE INDEX IF NOT EXISTS idx_quran_reciters_name ON public.quran_reciters USING btree (name);
        
        -- Enable RLS
        ALTER TABLE public.quran_reciters ENABLE ROW LEVEL SECURITY;
        
        -- Create policy to allow public read access
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_policies
                WHERE tablename = 'quran_reciters'
                AND policyname = 'Allow public read access'
            ) THEN
                CREATE POLICY "Allow public read access" ON public.quran_reciters FOR SELECT USING (true);
            END IF;
        END
        $$;
        
        -- Create policy to allow service role full access (optional, but good practice)
        -- Usually service role bypasses RLS, but just in case
        """
        
        cur.execute(sql)
        conn.commit()
        print("Table quran_reciters created/verified successfully.")
        
    except Exception as e:
        print(f"Error creating table: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    create_table()
