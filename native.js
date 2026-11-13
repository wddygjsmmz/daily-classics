(() => {
  // Alternate performances listed in public NetEase catalog/share links.
  const recordings = new Map([
    ['Clair de lune', '27682855'],
    ['Prelude in C major, BWV 846', '5157815'],
    ['Rondo alla turca, K. 331', '5189650'],
    ['Gymnopédie No. 1', '566084171'],
    ['Für Elise, WoO 59', '25830157']
  ]);

  function nativeLink(track) {
    const id = String(track.neteaseId || recordings.get(track.original) || '');
    if (!/^[1-9]\d{0,15}$/.test(id)) return 'orpheus://';
    // iPadOS can present a desktop user agent.
    const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (mobile) return 'orpheus://song/' + id + '/?autoplay=1';
    const command = JSON.stringify({type: 'song', id, cmd: 'play'});
    return 'orpheus://' + btoa(command);
  }

  // Bind on each lesson render; remove stale fallback text from the previous lesson.
  window.configureNativeMusic = function (anchor, track) {
    anchor.removeAttribute('target');
    anchor.href = nativeLink(track);
    anchor.textContent = '打开网易云音乐客户端';
    const oldHelp = document.getElementById('native-music-help');
    if (oldHelp) oldHelp.remove();
    anchor.onclick = () => {
      document.querySelector('audio')?.pause();
      if (document.getElementById('native-music-help')) return;
      const panel = document.createElement('div');
      panel.id = 'native-music-help';
      panel.className = 'muted';
      panel.style.cssText = 'flex-basis:100%;line-height:1.8';
      const query = [track.composer, track.title].filter(Boolean).join(' ');
      const text = document.createElement('span');
      text.textContent = '请允许浏览器打开本地客户端。若未定位到曲目，可在网易云中搜索「' + query + '」。 ';
      const copy = document.createElement('button');
      copy.type = 'button';
      copy.className = 'btn';
      copy.textContent = '复制曲名和作者';
      const message = document.createElement('span');
      message.setAttribute('role', 'status');
      copy.onclick = async () => {
        try {
          await navigator.clipboard.writeText(query);
          message.textContent = ' 已复制，可粘贴到网易云搜索。';
        } catch {
          message.textContent = ' 请选中上方曲名和作者复制。';
        }
      };
      panel.append(text, copy, message);
      anchor.insertAdjacentElement('afterend', panel);
    };
  };
})();
