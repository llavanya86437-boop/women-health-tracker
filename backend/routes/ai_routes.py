from fastapi import APIRouter
from pydantic import BaseModel
import os
from dotenv import load_dotenv
import google.generativeai as genai
import traceback

load_dotenv()

router = APIRouter(prefix="/ai", tags=["AI"])

# ---------------- API KEY ----------------
api_key = os.getenv("GOOGLE_API_KEY")

if not api_key:
    raise Exception("GOOGLE_API_KEY missing")

print("✅ API KEY LOADED:", bool(api_key))

genai.configure(api_key=api_key)

# ✅ FIXED MODEL (IMPORTANT)
model = genai.GenerativeModel("gemini-2.5-flash")


# ---------------- REQUEST MODEL ----------------
class ChatRequest(BaseModel):
    messages: list


# ---------------- CHAT API ----------------
@router.post("/wellness-chat")
async def wellness_chat(body: ChatRequest):

    try:
        messages = body.messages

        if not messages:
            return {"content": "No message received"}

        prompt = messages[-1].get("content", "").strip()

        if not prompt:
            return {"content": "Empty message"}

        system_prompt = """
You are Bloom, a women's wellness assistant.

Rules:
- Be simple and helpful
- Give structured advice
- Always include:
## Diet
## Exercise
## Mental Health
- End with medical disclaimer
"""

        full_prompt = f"{system_prompt}\nUser: {prompt}"

        response = model.generate_content(full_prompt)

        # SAFE PARSING
        text = getattr(response, "text", None)

        if not text:
            return {"content": "No response from Gemini"}

        return {"content": text}

    except Exception as e:
        print("❌ ERROR:", e)
        print(traceback.format_exc())

        return {"content": f"Server error: {str(e)}"}