"""Add timed macOS Samantha narration while preserving the 60-second video."""
import json
import pathlib
import re
import shutil
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[1]
ffmpeg = shutil.which('ffmpeg')
if not ffmpeg:
    import imageio_ffmpeg
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
segments = json.loads((ROOT / 'submission/narration.json').read_text())
work = ROOT / '.data/demo-recordings'
work.mkdir(parents=True, exist_ok=True)
video = ROOT / 'submission/demo.mp4'
output = video.with_name('demo-voiced.mp4')
command = [ffmpeg, '-y', '-hide_banner', '-loglevel', 'error', '-i', str(video)]
filters = []
for index, segment in enumerate(segments):
    audio = work / f'narration-{index}.aiff'
    subprocess.run(['say', '-v', 'Samantha', '-r', '180', '-o', str(audio), segment['text']], check=True)
    probe = subprocess.run([ffmpeg, '-hide_banner', '-i', str(audio)], capture_output=True, text=True)
    match = re.search(r'Duration: (\d+):(\d+):(\d+\.\d+)', probe.stderr)
    if not match:
        raise RuntimeError(f'Unable to inspect narration segment {index}')
    hours, minutes, seconds = map(float, match.groups())
    duration = hours * 3600 + minutes * 60 + seconds
    end = segments[index + 1]['start'] if index + 1 < len(segments) else 60
    window = end - segment['start'] - 0.25
    tempo = max(1, duration / window)
    if tempo > 1.3:
        raise RuntimeError(f'Segment {index} is too long; shorten its script.')
    command.extend(['-i', str(audio)])
    delay = int(segment['start'] * 1000)
    filters.append(f'[{index+1}:a]atempo={tempo:.6f},adelay={delay}:all=1[a{index}]')
filters.append(''.join(f'[a{i}]' for i in range(len(segments))) +
               f'amix=inputs={len(segments)}:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11,apad,atrim=duration=60[voice]')
command.extend(['-filter_complex', ';'.join(filters), '-map', '0:v:0', '-map', '[voice]',
                '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2',
                '-t', '60', '-movflags', '+faststart', str(output)])
subprocess.run(command, check=True)
output.replace(video)
print('Added synchronized Samantha narration to submission/demo.mp4 (60 seconds).')
