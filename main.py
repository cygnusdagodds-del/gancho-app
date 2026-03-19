import os
import uuid
import json
import subprocess
import tempfile
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
import anthropic
import shutil

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path("uploads")
OUTPUT_DIR = Path("outputs")
UPLOAD_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)

groq_client = Groq(api_key=os.environ["GROQ_API_KEY"])
claude_client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

jobs = {}  # job_id -> status/resultado


def extrair_audio(video_path: Path) -> Path:
    audio_path = video_path.with_suffix(".mp3")
    subprocess.run([
        "ffmpeg", "-i", str(video_path),
        "-vn", "-ar", "16000", "-ac", "1", "-b:a", "64k",
        str(audio_path), "-y", "-loglevel", "error"
    ], check=True)
    return audio_path


def transcrever(audio_path: Path) -> dict:
    with open(audio_path, "rb") as f:
        # Sem language= para auto-detecção: inglês, espanhol, português e mais
        result = groq_client.audio.transcriptions.create(
            file=f,
            model="whisper-large-v3",
            response_format="verbose_json",
            timestamp_granularities=["word"]
        )
    return result


def escolher_ganchos(transcript_text: str, duracao_total: float) -> list:
    prompt = f"""You are a social media video marketing expert (Reels, TikTok, Stories).

Analyze this transcript from a {duracao_total:.0f}-second video and choose the 3 best moments to use as HOOKS (shown at the beginning of the video to grab attention).

The transcript may be in any language (English, Spanish, Portuguese, etc).
Write the "trecho" and "motivo" fields in the same language as the transcript.

A good hook:
- Creates curiosity or surprise
- Makes a strong promise, revelation or statement
- Makes the viewer want to watch the rest
- Is at most 5-8 seconds long

Transcript:
{transcript_text}

Respond ONLY with valid JSON, no text before or after:
{{
  "ganchos": [
    {{
      "numero": 1,
      "inicio": 12.5,
      "fim": 18.0,
      "trecho": "excerpt text here",
      "motivo": "why this is a good hook"
    }},
    {{
      "numero": 2,
      "inicio": 35.2,
      "fim": 41.0,
      "trecho": "excerpt text here",
      "motivo": "why this is a good hook"
    }},
    {{
      "numero": 3,
      "inicio": 50.1,
      "fim": 55.8,
      "trecho": "excerpt text here",
      "motivo": "why this is a good hook"
    }}
  ]
}}

IMPORTANT: inicio and fim are timestamps in seconds within the original video."""

    response = claude_client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1000,
        messages=[{"role": "user", "content": prompt}]
    )

    texto = response.content[0].text.strip()
    texto = texto.replace("```json", "").replace("```", "").strip()
    return json.loads(texto)["ganchos"]


def montar_video(video_path: Path, gancho: dict, numero: int, formato: str, job_dir: Path) -> Path:
    """
    Corta o trecho do gancho e cola no início do vídeo completo.
    Formatos: '9x16' (stories 1080x1920) ou '3x4' (feed 1080x1350)
    """
    if formato == "9x16":
        w, h = 1080, 1920
        nome_formato = "stories"
    else:
        w, h = 1080, 1350
        nome_formato = "feed"

    crop_filter = f"crop='min(iw,ih*{w}/{h})':'min(ih,iw*{h}/{w})',scale={w}:{h}"

    gancho_path = job_dir / f"gancho_{numero}_{nome_formato}.mp4"
    final_path = job_dir / f"video_{numero}_{nome_formato}.mp4"
    lista_path = job_dir / f"lista_{numero}_{nome_formato}.txt"

    inicio = gancho["inicio"]
    duracao = gancho["fim"] - gancho["inicio"]

    # Corta o trecho do gancho
    subprocess.run([
        "ffmpeg", "-ss", str(inicio), "-i", str(video_path),
        "-t", str(duracao),
        "-vf", crop_filter,
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-c:a", "aac", "-b:a", "128k",
        str(gancho_path), "-y", "-loglevel", "error"
    ], check=True)

    # Vídeo completo no formato
    video_completo_path = job_dir / f"completo_{numero}_{nome_formato}.mp4"
    subprocess.run([
        "ffmpeg", "-i", str(video_path),
        "-vf", crop_filter,
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-c:a", "aac", "-b:a", "128k",
        str(video_completo_path), "-y", "-loglevel", "error"
    ], check=True)

    # Cria lista de concatenação
    with open(lista_path, "w") as f:
        f.write(f"file '{gancho_path.absolute()}'\n")
        f.write(f"file '{video_completo_path.absolute()}'\n")

    # Concatena gancho + vídeo completo
    subprocess.run([
        "ffmpeg", "-f", "concat", "-safe", "0",
        "-i", str(lista_path),
        "-c", "copy",
        str(final_path), "-y", "-loglevel", "error"
    ], check=True)

    return final_path


def processar_video(job_id: str, video_path: Path):
    try:
        jobs[job_id]["status"] = "transcrevendo"

        audio_path = extrair_audio(video_path)
        transcricao = transcrever(audio_path)
        texto_completo = transcricao.text
        duracao = transcricao.duration if hasattr(transcricao, 'duration') else 60.0

        jobs[job_id]["status"] = "analisando"

        ganchos = escolher_ganchos(texto_completo, duracao)

        jobs[job_id]["status"] = "montando"

        job_dir = OUTPUT_DIR / job_id
        job_dir.mkdir(exist_ok=True)

        videos = []
        for gancho in ganchos:
            for formato in ["9x16", "3x4"]:
                video_final = montar_video(video_path, gancho, gancho["numero"], formato, job_dir)
                nome_formato = "stories" if formato == "9x16" else "feed"
                videos.append({
                    "arquivo": video_final.name,
                    "gancho_numero": gancho["numero"],
                    "formato": nome_formato,
                    "trecho": gancho["trecho"],
                    "motivo": gancho["motivo"],
                    "url": f"/download/{job_id}/{video_final.name}"
                })

        jobs[job_id]["status"] = "pronto"
        jobs[job_id]["videos"] = videos
        jobs[job_id]["ganchos"] = ganchos

    except Exception as e:
        jobs[job_id]["status"] = "erro"
        jobs[job_id]["erro"] = str(e)


@app.post("/upload")
async def upload_video(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    if not file.filename.endswith((".mp4", ".mov", ".avi", ".webm")):
        raise HTTPException(400, "Formato não suportado. Use MP4, MOV, AVI ou WEBM.")

    job_id = str(uuid.uuid4())
    video_path = UPLOAD_DIR / f"{job_id}_{file.filename}"

    with open(video_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    jobs[job_id] = {"status": "processando", "videos": [], "erro": None}
    background_tasks.add_task(processar_video, job_id, video_path)

    return {"job_id": job_id}


@app.get("/status/{job_id}")
async def status(job_id: str):
    if job_id not in jobs:
        raise HTTPException(404, "Job não encontrado")
    return jobs[job_id]


@app.get("/download/{job_id}/{filename}")
async def download(job_id: str, filename: str):
    file_path = OUTPUT_DIR / job_id / filename
    if not file_path.exists():
        raise HTTPException(404, "Arquivo não encontrado")
    return FileResponse(file_path, media_type="video/mp4", filename=filename)


app.mount("/", StaticFiles(directory="static", html=True), name="static")
