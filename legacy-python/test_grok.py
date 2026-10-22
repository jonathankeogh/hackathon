import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()
client = OpenAI(api_key=os.environ["XAI_API_KEY"], base_url="https://api.x.ai/v1")
r = client.chat.completions.create(
    model="grok-4",
    messages=[{"role": "user", "content": "Say hi to the hackathon in five words."}],
)
print(r.choices[0].message.content)