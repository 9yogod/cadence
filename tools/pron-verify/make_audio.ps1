# Generates the test recordings for verify.mjs with Windows' built-in voices.
#   powershell -ExecutionPolicy Bypass -File tools\pron-verify\make_audio.ps1
# Zira (en-US) gives a clean native reading, with and without planted errors.
# Heami (ko-KR) reading the same English sentence gives a strongly Korean-accented take.
Add-Type -AssemblyName System.Speech
$out = Join-Path $PSScriptRoot 'audio'
New-Item -ItemType Directory -Force $out | Out-Null
$fmt = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(16000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer

function Say($voice, $name, $text) {
  $synth.SelectVoice($voice)
  $path = Join-Path $out ($name + '.wav')
  $synth.SetOutputToWaveFile($path, $fmt); $synth.Speak($text); $synth.SetOutputToNull()
  "wrote $name"
}

$ref = 'Could you walk me through the numbers before Thursday? I think the third option is really worth considering.'
Say 'Microsoft Zira Desktop'  'correct'      $ref
Say 'Microsoft Zira Desktop'  'th_errors'    'Could you walk me true the numbers before Tursday? I sink the tird option is really worth considering.'
Say 'Microsoft Zira Desktop'  'skipped'      'Could you walk me the numbers before Thursday? I think the option is worth.'
Say 'Microsoft Zira Desktop'  'wrong_text'   'The weather is nice today, so I want to go to the park with my dog.'
Say 'Microsoft Heami Desktop' 'korean_voice' $ref
$synth.Dispose()

# 3 s of digital silence in the same format
$n = 16000 * 3
$bytes = New-Object byte[] (44 + $n * 2)
$bw = New-Object System.IO.BinaryWriter([System.IO.MemoryStream]::new($bytes))
$bw.Write([Text.Encoding]::ASCII.GetBytes('RIFF')); $bw.Write([int](36 + $n * 2)); $bw.Write([Text.Encoding]::ASCII.GetBytes('WAVEfmt '))
$bw.Write([int]16); $bw.Write([int16]1); $bw.Write([int16]1); $bw.Write([int]16000); $bw.Write([int]32000); $bw.Write([int16]2); $bw.Write([int16]16)
$bw.Write([Text.Encoding]::ASCII.GetBytes('data')); $bw.Write([int]($n * 2))
[IO.File]::WriteAllBytes((Join-Path $out 'silence.wav'), $bytes)
"wrote silence"
