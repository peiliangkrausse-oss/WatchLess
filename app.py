import json
import re
import subprocess
import tempfile
from pathlib import Path

import streamlit as st
import webvtt
from openai import OpenAI


APP_TITLE = "YouTube Summary App"
DEFAULT_LM_STUDIO_URL = "http://localhost:1234/v1"
DEFAULT_MODEL = "local-model"


def clean_video_url(url: str) -> str:
    return url.strip()


def run_yt_dlp(video_url: str, output_dir: Path) -> dict:
    command = [
        "yt-dlp",
        "--skip-download",
        "--write-auto-subs",
        "--write-subs",
        "--sub-langs",
        "en.*",
        "--sub-format",
        "vtt",
        "--convert-subs",
        "vtt",
        "--print-json",
        "-o",
        str(output_dir / "%(id)s.%(ext)s"),
        video_url,
    ]
    result = subprocess.run(command, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "yt-dlp could not read this video.")

    lines = [line for line in result.stdout.splitlines() if line.strip()]
    if not lines:
        return {}
    return json.loads(lines[-1])


def find_vtt_file(output_dir: Path) -> Path:
    vtt_files = sorted(output_dir.glob("*.vtt"))
    if not vtt_files:
        raise FileNotFoundError(
            "No English captions were found. Try a video that has captions or auto-captions."
        )
    return vtt_files[0]


def transcript_from_vtt(vtt_path: Path) -> str:
    lines = []
    previous = None

    for caption in webvtt.read(str(vtt_path)):
        text = re.sub(r"<[^>]+>", "", caption.text)
        text = re.sub(r"\s+", " ", text).strip()
        if text and text != previous:
            lines.append(text)
            previous = text

    transcript = " ".join(lines)
    transcript = re.sub(r"\s+", " ", transcript).strip()
    if not transcript:
        raise ValueError("The captions file was found, but it did not contain readable text.")
    return transcript


def fetch_transcript(video_url: str) -> tuple[str, dict]:
    with tempfile.TemporaryDirectory() as temp_dir:
        output_dir = Path(temp_dir)
        metadata = run_yt_dlp(video_url, output_dir)
        vtt_path = find_vtt_file(output_dir)
        return transcript_from_vtt(vtt_path), metadata


def chunk_text(text: str, max_chars: int = 9000) -> list[str]:
    paragraphs = re.split(r"(?<=[.!?])\s+", text)
    chunks = []
    current = []
    current_len = 0

    for paragraph in paragraphs:
        paragraph_len = len(paragraph)
        if current and current_len + paragraph_len > max_chars:
            chunks.append(" ".join(current).strip())
            current = []
            current_len = 0
        current.append(paragraph)
        current_len += paragraph_len + 1

    if current:
        chunks.append(" ".join(current).strip())

    return [chunk for chunk in chunks if chunk]


def ask_lm_studio(
    prompt: str,
    system_prompt: str,
    base_url: str,
    model: str,
    temperature: float,
) -> str:
    client = OpenAI(base_url=base_url, api_key="lm-studio")
    selected_model = model.strip()
    if not selected_model or selected_model == DEFAULT_MODEL:
        models = client.models.list()
        if not models.data:
            raise RuntimeError("LM Studio is running, but no loaded model was found.")
        selected_model = models.data[0].id

    response = client.chat.completions.create(
        model=selected_model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ],
        temperature=temperature,
    )
    return response.choices[0].message.content.strip()


def summarize_transcript(
    transcript: str,
    base_url: str,
    model: str,
    style: str,
    temperature: float,
) -> str:
    chunks = chunk_text(transcript)
    system_prompt = (
        "You are an expert video summarizer. Be clear, accurate, and useful. "
        "Preserve important names, numbers, frameworks, claims, examples, and action steps."
    )

    chunk_summaries = []
    progress = st.progress(0, text="Summarizing transcript chunks...")

    for index, chunk in enumerate(chunks, start=1):
        prompt = f"""
Summarize this part of a YouTube transcript.

Rules:
- Remove filler, repetition, sponsorship fluff, and small talk.
- Keep the key ideas and examples.
- Use bullet points.
- Include any practical action steps.

Part {index} of {len(chunks)}:
{chunk}
""".strip()
        chunk_summary = ask_lm_studio(prompt, system_prompt, base_url, model, temperature)
        chunk_summaries.append(f"Part {index} summary:\n{chunk_summary}")
        progress.progress(index / len(chunks), text=f"Summarized chunk {index} of {len(chunks)}")

    joined_summaries = "\n\n".join(chunk_summaries)
    final_prompt = f"""
Create one polished {style.lower()} summary from these partial summaries.

Include:
- Main idea
- Key points
- Useful examples or details
- Action steps, if any
- A short "bottom line" section

Partial summaries:
{joined_summaries}
""".strip()
    progress.progress(1.0, text="Creating final summary...")
    return ask_lm_studio(final_prompt, system_prompt, base_url, model, temperature)


st.set_page_config(page_title=APP_TITLE, page_icon="YT", layout="wide")

st.title(APP_TITLE)
st.caption("Paste a YouTube URL. The app gets captions and summarizes them with your local LM Studio model.")

with st.sidebar:
    st.header("LM Studio")
    base_url = st.text_input("Local server URL", value=DEFAULT_LM_STUDIO_URL)
    model = st.text_input("Model name", value=DEFAULT_MODEL)
    st.caption("Leave this as local-model and the app will use the first model LM Studio reports.")
    style = st.selectbox("Summary style", ["Detailed", "Short", "Study notes", "Action plan"])
    temperature = st.slider("Creativity", min_value=0.0, max_value=1.0, value=0.2, step=0.1)

video_url = st.text_input("YouTube video URL", placeholder="https://www.youtube.com/watch?v=...")

if st.button("Summarize", type="primary", use_container_width=True):
    url = clean_video_url(video_url)
    if not url:
        st.error("Paste a YouTube URL first.")
    else:
        try:
            with st.status("Getting transcript...", expanded=True) as status:
                transcript, metadata = fetch_transcript(url)
                title = metadata.get("title", "YouTube video")
                duration = metadata.get("duration")
                status.update(label="Transcript ready.", state="complete")

            st.subheader(title)
            if duration:
                st.caption(f"Video length: about {round(duration / 60)} minutes")

            summary = summarize_transcript(transcript, base_url, model, style, temperature)
            st.subheader("Summary")
            st.markdown(summary)

            with st.expander("Transcript"):
                st.write(transcript)

            st.download_button(
                "Download summary as Markdown",
                data=f"# {title}\n\nSource: {url}\n\n{summary}\n",
                file_name="youtube-summary.md",
                mime="text/markdown",
            )
        except Exception as error:
            st.error(str(error))
            st.info(
                "Check that LM Studio's local server is running, your model is loaded, "
                "and the YouTube video has English captions."
            )
