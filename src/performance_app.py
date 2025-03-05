from flask import Flask, request, Response, jsonify
from flask_cors import CORS
import re
import io
import threading
from gtts import gTTS
from langdetect import detect_langs, DetectorFactory

DetectorFactory.seed = 0

app = Flask(__name__)
# Allow requests from http://localhost:3000
CORS(app, origins=["http://localhost:3000"])


def detect_language(sentence):
    try:
        detected = detect_langs(sentence)
        if detected:
            return max(detected, key=lambda x: x.prob).lang
    except Exception:
        pass
    return "unknown"


def split_text_by_sentences(text):
    sentences = re.split(r'(?<=[.!:?])\s+', text.strip())
    return [sentence.strip() for sentence in sentences if sentence]


def process_sentences(sentences):
    ordered_segments = []
    for sentence in sentences:
        lang = detect_language(sentence)
        lang = ("en")
        ordered_segments.append((lang, sentence))
    return ordered_segments


def generate_audio_stream(sentences):
    audio_buffers = []

    def process_segment(lang, segment, index):
        if lang != "unknown":
            audio_buffer = io.BytesIO()
            tts = gTTS(text=segment, lang=lang)
            tts.write_to_fp(audio_buffer)
            audio_buffer.seek(0)
            audio_buffers.append((index, audio_buffer.read()))

    threads = []
    for i, (lang, segment) in enumerate(sentences):
        thread = threading.Thread(
            target=process_segment, args=(lang, segment, i))
        thread.start()
        threads.append(thread)

    for thread in threads:
        thread.join()

    for _, audio_data in sorted(audio_buffers):
        yield audio_data


@app.route('/tts', methods=['POST'])
def text_to_speech():
    try:
        text = request.form.get("text", "").strip()
        if not text:
            return jsonify({"error": "No text provided"}), 400

        sentences = split_text_by_sentences(text)
        ordered_segments = process_sentences(sentences)
        if not ordered_segments:
            return jsonify({"error": "Could not detect any languages"}), 400

        return Response(generate_audio_stream(ordered_segments), mimetype="audio/mpeg")
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)