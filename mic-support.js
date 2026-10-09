'use strict';
(() => {
  const button = document.getElementById('test-mic');
  const diagnostic = document.getElementById('mic-diagnostic');
  const meter = document.getElementById('mic-level');
  let running = false, stream, context, interval, timer, attempt = 0;

  function release() {
    clearInterval(interval);
    clearTimeout(timer);
    stream?.getTracks().forEach(track => track.stop());
    stream = null;
    if (context) context.close().catch(() => {});
    context = null;
    meter.hidden = true;
    meter.value = 0;
    running = false;
    window.sintraMicTestActive = false;
    button.disabled = false;
    button.textContent = 'Testar microfone por 5 segundos';
    // The recognition control remains independent from this local audio test.
    document.getElementById('mic').setAttribute('aria-pressed', 'false');
    document.getElementById('mic').disabled = !(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  button.onclick = async () => {
    if (running) return;
    const mic = document.getElementById('mic');
    if (mic.getAttribute('aria-pressed') === 'true' || mic.disabled && (window.SpeechRecognition || window.webkitSpeechRecognition)) {
      diagnostic.textContent = 'Encerre a gravação atual antes de testar o microfone.';
      return;
    }
    const current = ++attempt;
    running = true;
    window.sintraMicTestActive = true;
    button.disabled = true;
    mic.disabled = true;
    mic.setAttribute('aria-pressed', 'true');
    button.textContent = 'Testando…';
    diagnostic.textContent = 'Aguardando acesso ao microfone…';
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        throw new Error('Abra o site com HTTPS em um navegador que permita captura de áudio.');
      }
      // No audio is stored or sent. Always release the device, including on navigation.
      const captured = await navigator.mediaDevices.getUserMedia({audio: true});
      if (current !== attempt) { captured.getTracks().forEach(track => track.stop()); return; }
      stream = captured;
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) {
        diagnostic.textContent = 'O navegador conseguiu abrir o microfone. O reconhecimento de fala usa um serviço separado; se ele continuar recusando, confira as restrições do navegador ou teste outro navegador compatível.';
        release();
        return;
      }
      context = new AudioContext();
      await context.resume();
      if (current !== attempt) return;
      const analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      context.createMediaStreamSource(stream).connect(analyser);
      const samples = new Uint8Array(analyser.fftSize);
      let peak = 0;
      diagnostic.textContent = 'Microfone acessível. Fale agora e observe a barra de volume.';
      meter.hidden = false;
      interval = setInterval(() => {
        analyser.getByteTimeDomainData(samples);
        const rms = Math.sqrt(samples.reduce((sum, value) => sum + ((value - 128) / 128) ** 2, 0) / samples.length);
        peak = Math.max(peak, rms);
        meter.value = Math.min(1, rms * 5);
      }, 80);
      timer = setTimeout(() => {
        diagnostic.textContent = peak > 0.008
          ? 'O microfone está recebendo áudio. Se a transcrição ainda for recusada, o bloqueio está no reconhecimento de voz, não na permissão de captura. Reinicie o navegador ou teste outro navegador com reconhecimento de voz. Também é possível digitar.'
          : 'O navegador abriu o microfone, mas não detectou volume suficiente. Confira o botão de mudo, o dispositivo de entrada e o volume do microfone no Windows e no Chrome.';
        release();
      }, 5000);
    } catch (error) {
      if (current !== attempt) return;
      const messages = {
        NotAllowedError: 'A captura de áudio foi bloqueada. Como a permissão do site pode já estar ativa, confira também o acesso ao microfone para aplicativos da área de trabalho nas configurações de privacidade do Windows.',
        NotFoundError: 'Nenhum microfone foi encontrado. Conecte um microfone e selecione-o nas configurações do Chrome.',
        NotReadableError: 'O microfone não pôde ser aberto. Feche outros aplicativos que usam áudio e confira o dispositivo selecionado.',
        AbortError: 'O teste de áudio foi interrompido. Tente novamente.'
      };
      diagnostic.textContent = messages[error.name] || error.message || 'Não foi possível testar o microfone.';
      release();
    }
  };
  window.addEventListener('pagehide', () => { attempt++; if (running) release(); });
})();
