import os
from fastapi import FastAPI, Response

YOUTUBE_DL_COMMAND = "yt-dlp -f bestaudio -g"

app = FastAPI()

@app.get("/")
async def root():
    return {"message": "Hello World"}

@app.get("/bestaudio")
async def m4a(response: Response, url: str):
    output_stream = os.popen(f"{YOUTUBE_DL_COMMAND} {url}")
    audio_url = output_stream.read()[:-1]
    response.headers["Access-Control-Allow-Origin"] = "*"
    return {"bestaudio_url": audio_url}