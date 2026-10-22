import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])
sb.table("notes").insert({"text": "hello hackathon"}).execute()
print(sb.table("notes").select("*").execute().data)