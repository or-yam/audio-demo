import './style.css';

const CANVAS_WIDTH = window.innerWidth;
const CANVAS_HEIGHT = 400;

const playButton = document.querySelector('#play')!;
const audio: HTMLAudioElement = document.querySelector('audio')!;
const canvas: HTMLCanvasElement = document.querySelector('canvas')!;

const canvasContext = canvas.getContext('2d')!;
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

const initAudio = (audioElement: HTMLAudioElement) => {
  const audioContext = new AudioContext();
  const mediaElementSource = audioContext.createMediaElementSource(audioElement);
  const analyser = audioContext.createAnalyser();

  mediaElementSource.connect(analyser);
  analyser.connect(audioContext.destination);
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

  dataArray.forEach((barHeight, index) => {
    const r = barHeight + 5 * (index / bufferLength);
    const g = 250 * (index / bufferLength);
    const b = 70;
    canvasContext.fillStyle = `rgb(${r}, ${g}, ${b})`;
    canvasContext.fillRect(rectX, CANVAS_HEIGHT - barHeight, barWidth, barHeight);
    rectX += barWidth + 1;
  });
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

const renderVisualizations = () => {
  const { analyser, bufferLength, dataArray } = initAudio(audio);
  renderOscilloscope(analyser, bufferLength, dataArray);
  renderFrequencyGraph(analyser, bufferLength, dataArray);
};

audio.onplay = renderVisualizations;

playButton.addEventListener('click', () => {
  if (audio.paused) {
    audio.play();
    playButton.textContent = '⏸';
  } else {
    audio.pause();
    playButton.textContent = '▶';
  }
});
