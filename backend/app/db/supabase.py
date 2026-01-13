from supabase import create_client, Client
from app.config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

def get_supabase_client() -> Client:
    """Create and return a Supabase client using service role key for backend operations."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise ValueError("Supabase credentials not configured. Check your .env file.")
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# Singleton client instance
supabase: Client = None

def get_db() -> Client:
    """Get or create the Supabase client singleton."""
    global supabase
    if supabase is None:
        supabase = get_supabase_client()
    return supabase
