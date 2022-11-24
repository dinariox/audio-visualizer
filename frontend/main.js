/* =-=-=-=-=-= PARAMTER =-=-=-=-=-= */
const DOWNLOAD_URL_API_BASE = 'http://localhost:8000/bestaudio?url=';
const CORS_PROXY = 'http://localhost:8080/';
const SAMPLES = 1024;
const COLOR_CHANGE_INTERVAL = 80;

/* =-=-=-=-=-= MAIN =-=-=-=-=-= */
const audio1 = new Audio();
// audio1.src = '/audio/4.m4a';

const container = document.querySelector('#container');
const canvas = document.querySelector('#canvas');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const ctx = canvas.getContext('2d');

const audioCtx = new AudioContext();
let audioSource = null;
let analyser = null;

const playPauseButton = document.querySelector('#play-pause');
playPauseButton.addEventListener('click', () => {
	if (audio1.paused) {
		audio1.play();
		playPauseButton.innerHTML = 'Pause';
	} else {
		audio1.pause();
		playPauseButton.innerHTML = 'Play';
	}
});

const audioUrlInput = document.querySelector('#audio-url');
const downloadButton = document.querySelector('#download');
downloadButton.addEventListener('click', async () => {
	console.log('Getting download URL...');
	const downloadUrlResp = await fetch(DOWNLOAD_URL_API_BASE + audioUrlInput.value);
	console.log(downloadUrlResp);
	const downloadUrlJson = await downloadUrlResp.json();
	const downloadUrl = downloadUrlJson.bestaudio_url;

	const response = await fetch(CORS_PROXY + downloadUrl, {
		headers: {
			accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
			'accept-language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
			'cache-control': 'max-age=0',
			'if-modified-since': 'Mon, 29 Oct 2018 02:53:43 GMT',
			range: 'bytes=0-',
			'sec-ch-ua': '"Google Chrome";v="107", "Chromium";v="107", "Not=A?Brand";v="24"',
			'sec-ch-ua-mobile': '?0',
			'sec-ch-ua-platform': '"Windows"',
			'sec-fetch-dest': 'document',
			'sec-fetch-mode': 'navigate',
			'sec-fetch-site': 'none',
			'sec-fetch-user': '?1',
			'upgrade-insecure-requests': '1',
			'x-client-data': 'CIi2yQEIpbbJAQjEtskBCKmdygEIqOnKAQiSocsBCMbhzAEI/erMAQjn68wBCPHtzAEIjffMAQjN+cwBCOH5zAEIzPrMAQik+8wBCKn8zAE='
		},
		referrerPolicy: 'strict-origin-when-cross-origin',
		body: null,
		method: 'GET',
		mode: 'cors',
		credentials: 'omit'
	});
	const reader = response.body.getReader();
	const contentLength = +response.headers.get('Content-Length');
	let receivedLength = 0;
	let chunks = [];
	while (true) {
		const { done, value } = await reader.read();

		if (done) {
			break;
		}

		receivedLength += value.length;
		chunks.push(value);

		console.log('Progress: ' + (receivedLength / contentLength) * 100);
	}

	const chunksAll = new Uint8Array(receivedLength);
	let position = 0;
	for (let chunk of chunks) {
		chunksAll.set(chunk, position);
		position += chunk.length;
	}

	const blob = new Blob([chunksAll]);

	const url = window.URL.createObjectURL(blob);
	console.log(url);
	audio1.src = url;
});

window.addEventListener('resize', () => {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
});

audio1.volume = 0.5;
audioSource = audioCtx.createMediaElementSource(audio1);
analyser = audioCtx.createAnalyser();
audioSource.connect(analyser);
analyser.connect(audioCtx.destination);

analyser.fftSize = SAMPLES * 2;
analyser.minDecibels = -120;
analyser.maxDecibels = -10;
analyser.smoothingTimeConstant = 0.85;
const bufferLength = analyser.frequencyBinCount;
const dataArray = new Uint8Array(bufferLength);
const barWidth = (canvas.width / bufferLength) * 2;

function getFPS() {
	const now = performance.now();
	while (times.length > 0 && times[0] <= now - 1000) {
		times.shift();
	}
	times.push(now);
	return times.length;
}

function drawFPS() {
	fps = getFPS();
	ctx.fillStyle = 'white';
	ctx.font = '20px Arial';
	ctx.fillText('FPS: ' + fps, 10, 20);
}

function calculateVolume(startBand, endBand) {
	const slicedArray = dataArray.slice(startBand, endBand);
	const total = slicedArray.reduce((acc, val) => acc + val);
	return total / slicedArray.length / 255;
}

function drawBackground() {
	const volume = calculateVolume(0, SAMPLES / 8);
	ctx.fillStyle = `hsl(${degree + 200}, 40%, ${volume * 60 + 10}%)`;
	ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawBar() {
	x = 0;
	for (let i = 0; i < bufferLength / 2; i++) {
		const barHeight = dataArray[i] * 4;
		const r = barHeight + 25 * (i / bufferLength);
		const g = 250 * (i / bufferLength);
		const b = 50;
		ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
		ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
		x += barWidth;
	}
}

let gradient;
let degree = 0;
let lastTimeDegreeChanged = 0;

function drawLine() {
	gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
	gradient.addColorStop(0, `hsl(${degree}, 100%, 50%)`);
	gradient.addColorStop(0.5, `hsl(${degree + 40}, 100%, 50%)`);
	gradient.addColorStop(1, `hsl(${degree + 80}, 100%, 50%)`);
	ctx.strokeStyle = 'white';
	ctx.lineWidth = 6;
	ctx.fillStyle = gradient;
	ctx.beginPath();
	ctx.moveTo(0, canvas.height - dataArray[0] * 4);
	for (let i = 1; i < bufferLength / 2; i++) {
		const x = i * barWidth;
		const y = canvas.height - dataArray[i] * 4;
		const xnext = (i + 1) * barWidth;
		const ynext = canvas.height - dataArray[i + 1] * 4;

		const xc = (x + xnext) / 2;
		const yc = (y + ynext) / 2;

		ctx.quadraticCurveTo(x, y, xc, yc);
	}
	ctx.lineTo(canvas.width, canvas.height);
	ctx.lineTo(0, canvas.height);
	ctx.fill();

	ctx.beginPath();
	ctx.moveTo(0, canvas.height - dataArray[0] * 4);
	for (let i = 1; i < bufferLength / 2; i++) {
		const x = i * barWidth;
		const y = canvas.height - dataArray[i] * 4;
		const xnext = (i + 1) * barWidth;
		const ynext = canvas.height - dataArray[i + 1] * 4;

		const xc = (x + xnext) / 2;
		const yc = (y + ynext) / 2;

		ctx.quadraticCurveTo(x, y, xc, yc);
	}
	ctx.stroke();

	if (performance.now() - lastTimeDegreeChanged > COLOR_CHANGE_INTERVAL) {
		degree++;
		if (degree >= 360) {
			degree = 0;
		}
		lastTimeDegreeChanged = performance.now();
	}
}

let times = [];
let fps;
let x = 0;
function animate() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	analyser.getByteFrequencyData(dataArray);

	drawBackground();
	drawLine();
	drawFPS();

	requestAnimationFrame(animate);
}

audio1.src = '/audio/4.m4a';

animate();
