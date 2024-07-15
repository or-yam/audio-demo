import './style.css';
import processorUrl from './processor?url';

const CANVAS_WIDTH = window.innerWidth;
const CANVAS_HEIGHT = 400;

const playButton = document.querySelector('#play')!;
const microphoneButton = document.querySelector('#mic')!;
const frequencySpan = document.querySelector('#frequency')!.getElementsByTagName('span')[0];
const frequencyMeter: HTMLDivElement = document.querySelector('#hz-meter')!;
const audio: HTMLAudioElement = document.querySelector('audio')!;
const canvas: HTMLCanvasElement = document.querySelector('canvas')!;

let mediaElementSource: MediaStreamAudioSourceNode | MediaElementAudioSourceNode;
let micStream: MediaStream;
let micState = false;
let audioContext: AudioContext;

const canvasContext = canvas.getContext('2d')!;
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

const initAudio = async (audioElement?: HTMLAudioElement) => {
  audioContext = new AudioContext();
  const analyser = audioContext.createAnalyser();

  if (!audioElement) {
    // Initialize microphone

    //   Processor
    await audioContext.audioWorklet.addModule(processorUrl);
    const processor = new AudioWorkletNode(audioContext, 'processor');

    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      console.log(err);
      window.alert('You must give access to your mic in order to proceed');
      throw err;
    }

    mediaElementSource = audioContext.createMediaStreamSource(micStream);
    mediaElementSource.connect(processor);
  } else {
    // Initialize audio element
    mediaElementSource = audioContext.createMediaElementSource(audioElement);
    analyser.connect(audioContext.destination);
  }

  mediaElementSource.connect(analyser);
  analyser.fftSize = 2 ** 8;
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  return { analyser, bufferLength, dataArray };
};

const renderFrequencyGraph = (analyser: AnalyserNode, bufferLength: number, dataArray: Uint8Array) => {
  const barWidth = CANVAS_WIDTH / bufferLength;
  requestAnimationFrame(() => renderFrequencyGraph(analyser, bufferLength, dataArray));
  analyser.getByteFrequencyData(dataArray);

  let rectX = 0;

  let maxAmplitude = -Infinity;
  let dominantFrequency = 0;

  dataArray.forEach((barHeight, index) => {
    const r = barHeight + 5 * (index / bufferLength);
    const g = 250 * (index / bufferLength);
    const b = 70;
    canvasContext.fillStyle = `rgb(${r}, ${g}, ${b})`;
    canvasContext.fillRect(rectX, CANVAS_HEIGHT - barHeight, barWidth, barHeight);
    rectX += barWidth + 1;

    if (barHeight > maxAmplitude) {
      maxAmplitude = barHeight;
      dominantFrequency = (index * (audioContext.sampleRate / 2)) / bufferLength;
    }
  });

  // NOT REALLY WORKING
  const deg = dominantFrequency > 172 ? 90 : dominantFrequency <= 0 ? -90 : dominantFrequency * 180 - 90;
  frequencyMeter.style.transform = `rotate(${deg}deg)`;
  frequencySpan.innerHTML = `${dominantFrequency.toFixed(2)} hz`;
};

const renderOscilloscope = (analyser: AnalyserNode, bufferLength: number, dataArray: Uint8Array) => {
  requestAnimationFrame(() => renderOscilloscope(analyser, bufferLength, dataArray));
  analyser.getByteTimeDomainData(dataArray);
  canvasContext.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  canvasContext.lineWidth = 5;
  canvasContext.strokeStyle = '#ffcc00';
  canvasContext.beginPath();
  const sliceWidth = CANVAS_WIDTH / bufferLength;

  let x = 0;

  dataArray.forEach((data, index) => {
    const v = data / 128;
    const y = (v * CANVAS_HEIGHT) / 2;

    if (index === 0) {
      canvasContext.moveTo(x, y);
    } else {
      canvasContext.lineTo(x, y);
    }

    x += sliceWidth;
  });
  canvasContext.stroke();
};

const renderVisualizations = async () => {
  const { analyser, bufferLength, dataArray } = await initAudio(audio);
  if (!analyser) return;
  renderOscilloscope(analyser, bufferLength, dataArray);
  renderFrequencyGraph(analyser, bufferLength, dataArray);
};

audio.onplay = renderVisualizations;

playButton.addEventListener('click', () => {
  if (micState) {
    micStream.getTracks().forEach((track) => track.stop());
    micState = false;
    microphoneButton.textContent = '🎤';
  }
  if (audio.paused) {
    audio.play();
    playButton.textContent = '⏸';
  } else {
    audio.pause();
    playButton.textContent = '▶';
  }
});

microphoneButton.addEventListener('click', async () => {
  if (micState) {
    micStream.getTracks().forEach((track) => track.stop());
    micState = false;
    microphoneButton.textContent = '🎤';
    return;
  }
  const { analyser, bufferLength, dataArray } = await initAudio();
  if (!analyser) return;

  renderOscilloscope(analyser, bufferLength, dataArray);
  renderFrequencyGraph(analyser, bufferLength, dataArray);
  microphoneButton.textContent = '🛑';
  micState = true;
});
