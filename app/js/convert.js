/*
 * © MedioAI.com - Wynter Jones (@AI.MASSIVE)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

const { createFFmpeg, fetchFile } = FFmpeg

const ffmpeg = createFFmpeg({
  corePath: chrome.runtime.getURL('lib/ffmpeg-core.js'),
  log: true,
  mainName: 'main',
})

const masterAudio = document.getElementById('convert')
masterAudio.addEventListener('click', async e => {
  if (!e.target.classList.contains('converting')) {
    e.target.classList.add('converting')
    e.target.classList.add('disabled')
    e.target.innerText = 'Converting...'
    await convertMp3ToWav(e)
  } else {
    alert('Please wait for the conversion to finish')
  }
})

async function convertMp3ToWav(e) {
  const outputFileName = 'medioai.wav'
  const sampleFileName = 'medioai.mp3'
  const inputAudioUrl = document.getElementById('mp3').files[0]

  if (inputAudioUrl) {
    const bitrate = document.querySelector('#bitrate').value || '320'
    const samplerate = document.querySelector('#samplerate').value || '192000'
    const fadeInDuration = document.querySelector('#fadein').value || 0
    const fadeOutDuration = document.querySelector('#fadeout').value || 0
    const filter = document.querySelector('#filter').value || ''

    let audioFilter = ''
    switch (filter) {
      case 'loud':
        audioFilter = 'loudnorm=I=-11:LRA=7:TP=-1,alimiter=limit=0.9,'
        break
      case 'normal':
        audioFilter = 'loudnorm=I=-14:LRA=7:TP=-2,alimiter=limit=0.9,'
        break
      case 'quiet':
        audioFilter = 'loudnorm=I=-19:LRA=7:TP=-3,alimiter=limit=0.9,'
        break
      case 'brighter':
        audioFilter = 'treble=g=3,'
        break
      case 'bassier':
        audioFilter = 'bass=g=3,'
        break
      case 'volume_up':
        audioFilter = 'volume=1.5,'
        break
      case 'volume_down':
        audioFilter = 'volume=0.5,'
        break
      case 'dynaudnorm':
        audioFilter = 'dynaudnorm=f=250:g=8,'
        break
      case 'none':
      default:
        audioFilter = ''
    }

    const duration = await getAudioDurationInSeconds(inputAudioUrl)
    const fadeOutStartTime = duration - fadeOutDuration

    const commandStr = `ffmpeg -i ${sampleFileName} -af ${audioFilter}afade=t=in:ss=0:d=${fadeInDuration},afade=t=out:st=${fadeOutStartTime}:d=${fadeOutDuration} -b:a ${bitrate}k -ar ${samplerate} ${outputFileName}`

    await runFFmpeg(sampleFileName, outputFileName, commandStr, inputAudioUrl)

    e.target.classList.remove('converting')
    e.target.classList.remove('disabled')
    e.target.innerText = 'Convert to .WAV'
  } else {
    alert('Please select an audio file')
  }
}

async function getAudioDurationInSeconds(audioFile) {
  return new Promise((resolve, reject) => {
    let reader = new FileReader()
    reader.onload = function (ev) {
      try {
        let audioContext = new (window.AudioContext || window.webkitAudioContext)()
        audioContext.decodeAudioData(ev.target.result, function (buffer) {
          resolve(buffer.duration)
        })
      } catch (e) {
        reject(e)
      }
    }
    reader.onerror = function (e) {
      reject(e)
    }
    reader.readAsArrayBuffer(audioFile)
  })
}

async function runFFmpeg(inputFileName, outputFileName, commandStr, file) {
  if (ffmpeg.isLoaded()) {
    await ffmpeg.exit()
  }

  await ffmpeg.load()

  const commandList = commandStr.split(' ')
  if (commandList.shift() !== 'ffmpeg') {
    console.error('Error running FFMPEG. ')
    return
  }

  ffmpeg.FS('writeFile', inputFileName, await fetchFile(file))
  await ffmpeg.run(...commandList)

  const data = ffmpeg.FS('readFile', outputFileName)
  const blob = new Blob([data.buffer])
  downloadFile(blob, outputFileName)
  showWaveForm(blob)
}

async function showWaveForm(blob) {
  const waveformpreview = document.getElementById('waveformpreview')
  waveformpreview.style.display = 'none'
  const wavepreviewCanvas = document.getElementById('waveformcanvas')
  wavepreviewCanvas.style.display = 'block'
  const canvasContext = wavepreviewCanvas.getContext('2d')
  const audioContext = new (window.AudioContext || window.webkitAudioContext)()

  const arrayBuffer = await blob.arrayBuffer()
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

  const parentWidth = wavepreviewCanvas.parentElement.clientWidth
  wavepreviewCanvas.width = parentWidth

  canvasContext.clearRect(0, 0, wavepreviewCanvas.width, wavepreviewCanvas.height)

  const bufferLength = audioBuffer.length
  const data = audioBuffer.getChannelData(0)
  const step = Math.ceil(bufferLength / wavepreviewCanvas.width)
  const amp = wavepreviewCanvas.height / 2

  canvasContext.fillStyle = 'transparent'
  canvasContext.fillRect(0, 0, wavepreviewCanvas.width, wavepreviewCanvas.height)
  canvasContext.strokeStyle = '#25CC8C'
  canvasContext.lineWidth = 1

  canvasContext.beginPath()
  for (let i = 0; i < wavepreviewCanvas.width; i++) {
    const min = data[i * step]
    const x = i
    const y = (1 + min) * amp
    if (i === 0) {
      canvasContext.moveTo(x, y)
    } else {
      canvasContext.lineTo(x, y)
    }
  }
  canvasContext.stroke()
}

function downloadFile(blob, fileName) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = fileName
  a.click()
}

const slideContainers = document.querySelectorAll(".slidecontainer input[type='range']")
slideContainers.forEach(slideContainer => {
  slideContainer.addEventListener('input', function (e) {
    let value = e.target.value
    const id = e.target.id
    document.querySelector(`#${id}`, `.value[data-value="${value}"]`)

    if (id === 'fadein' || id === 'fadeout') {
      value = `${value} Seconds`
    }
    document.querySelector(`.value[data-value="${id}"]`).innerText = value
  })
})
