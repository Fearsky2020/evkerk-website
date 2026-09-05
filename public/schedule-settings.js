(() => {
  function applyItem(row, data) {
    if (!row || !data) return;
    const spans = row.querySelectorAll('span,strong,em');
    if (spans[0]) spans[0].textContent = document.documentElement.lang === 'nl' ? data.day_nl : data.day_zh;
    if (spans[1]) spans[1].textContent = data.time || '';
    if (spans[2]) spans[2].textContent = document.documentElement.lang === 'nl' ? data.label_nl : data.label_zh;
  }

  let schedule = null;
  function render() {
    if (!schedule) return;
    const cards = document.querySelectorAll('.gathering-card');
    const rijswijk = cards[0]?.querySelectorAll('.weekly-program > div') || [];
    const zoetermeer = cards[1]?.querySelectorAll('.weekly-program > div') || [];
    applyItem(rijswijk[0], schedule.rijswijk_service);
    applyItem(rijswijk[1], schedule.rijswijk_school);
    applyItem(zoetermeer[0], schedule.zoetermeer_course);
    applyItem(zoetermeer[1], schedule.zoetermeer_service);
    applyItem(zoetermeer[2], schedule.zoetermeer_school);
    applyItem(zoetermeer[3], schedule.zoetermeer_bible);
    const rTop = cards[0]?.querySelector('.card-top strong');
    const zTop = cards[1]?.querySelector('.card-top strong');
    if (rTop && schedule.rijswijk_service?.time) rTop.textContent = schedule.rijswijk_service.time;
    if (zTop && schedule.zoetermeer_service?.time) zTop.textContent = schedule.zoetermeer_service.time;
  }

  fetch('/api/site-settings/schedule', { headers: { Accept: 'application/json' } })
    .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
    .then(body => { schedule = body.schedule || null; render(); })
    .catch(() => {});

  new MutationObserver(render).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
})();
