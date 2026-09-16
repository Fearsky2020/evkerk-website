(() => {
  if (document.getElementById('sermonPlayHoverFix')) return;
  const style = document.createElement('style');
  style.id = 'sermonPlayHoverFix';
  style.textContent = `
    button.sermon-play-toggle {
      transform: none !important;
      transition: box-shadow .18s ease !important;
    }
    button.sermon-play-toggle:hover {
      transform: none !important;
      box-shadow: 0 14px 30px rgba(8,127,174,.28) !important;
    }
    button.sermon-play-toggle span {
      transition: transform .18s ease !important;
    }
    button.sermon-play-toggle:hover span {
      transform: scale(1.08);
    }
  `;
  document.head.appendChild(style);
})();
