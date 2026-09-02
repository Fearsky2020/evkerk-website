(() => {
  'use strict';
  const word = document.getElementById('wordDutch');
  if (!word) return;
  const resize = () => {
    const text = String(word.textContent || '').replace(/\s+/g, ' ').trim();
    word.classList.remove('long-word','xlong-word');
    if (text.length > 14) word.classList.add('xlong-word');
    else if (text.length > 10) word.classList.add('long-word');
  };
  new MutationObserver(resize).observe(word,{childList:true,characterData:true,subtree:true});
  resize();
})();
