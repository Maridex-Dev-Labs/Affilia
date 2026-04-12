from pydantic import BaseModel
import os

class Settings(BaseModel):
    SUPABASE_URL: str = os.getenv('SUPABASE_URL', '')
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv('SUPABASE_SERVICE_ROLE_KEY', '')
    REDIS_URL: str = os.getenv('REDIS_URL', '')
    SECRET_KEY: str = os.getenv('SECRET_KEY', 'dev')
    APP_URL: str = os.getenv('APP_URL', 'http://localhost:6100')
    ENVIRONMENT: str = os.getenv('ENVIRONMENT', 'development')

settings = Settings()
