from fastapi import APIRouter
from pydantic import BaseModel
import google.generativeai as genai
import os

router = APIRouter(prefix="/ai", tags=["AI"])

genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

model = genai.GenerativeModel("gemini-2.5-flash")


class PregnancyRequest(BaseModel):
    mode: str
    month: int
    lang: str


@router.post("/pregnancy-guide")
async def pregnancy_guide(data: PregnancyRequest):

    try:
        prompt = f"""
        Give pregnancy guidance.

        Mode: {data.mode}
        Month: {data.month}
        Language: {data.lang}

        Include:
        - Diet
        - Exercise
        - Mental wellness
        """

        response = model.generate_content(prompt)

        return {
            "content": response.text
        }

    except Exception as e:
        print("ERROR:", e)

        return {
            "error": str(e)
        }