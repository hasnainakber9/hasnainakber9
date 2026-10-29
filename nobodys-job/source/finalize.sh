#!/bin/bash
# loudness: linear gain to -14 LUFS + oversampled limiter (true peak <= -1 dBTP); then master + captioned encodes; then verification
set -e
meas() { ffmpeg -hide_banner -nostats -i "$1" -af ebur128=peak=true -f null - 2>&1 | awk '/Summary/{s=1} s&&/I:/{i=$2} s&&/Peak:/{p=$2} END{print i, p}'; }
read I P < <(meas premix.wav); echo "premix: I=$I LUFS, TP=$P dBFS"
G=$(python3 -c "print(round(-14.0 - $I, 2))")
for pass in 1 2; do
  ffmpeg -y -v error -i premix.wav -af "volume=${G}dB,aresample=192000,alimiter=limit=0.84:attack=1:release=60:level=false,aresample=48000,atrim=0:119" -ar 48000 -ac 2 -c:a pcm_s24le mix_final.wav
  read I2 P2 < <(meas mix_final.wav); echo "pass $pass: gain ${G} dB -> I=$I2 LUFS, TP=$P2 dBTP"
  G=$(python3 -c "print(round($G + (-14.0 - $I2), 2))")
done
python3 make_srt.py
ENC="-c:v libx264 -preset slow -crf 19 -g 48 -pix_fmt yuv420p -color_primaries bt709 -color_trc bt709 -colorspace bt709 -c:a aac -b:a 320k -ar 48000 -movflags +faststart"
ffmpeg -y -v error -i picture.mp4 -i mix_final.wav -map 0:v -map 1:a $ENC -t 119 Nobodys_Job_master_1080p.mp4
ffmpeg -y -v error -i picture.mp4 -i mix_final.wav -map 0:v -map 1:a \
  -vf "subtitles=Nobodys_Job.en.srt:force_style='FontName=Inter,FontSize=13,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=1.6,Shadow=0.6,MarginV=40'" \
  $ENC -t 119 Nobodys_Job_captioned_1080p.mp4
for f in Nobodys_Job_master_1080p.mp4 Nobodys_Job_captioned_1080p.mp4; do
  echo "== $f  $(du -m $f | cut -f1) MB"
  ffprobe -v error -show_entries format=duration:stream=codec_name,width,height,r_frame_rate,sample_rate,channels -of compact $f
  read I3 P3 < <(meas $f); echo "   loudness I=$I3 LUFS, true peak=$P3 dBTP"
done
