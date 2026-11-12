'use strict';
const keyInput = document.getElementById('key');
const status = document.getElementById('status');
const show = (result) => { status.textContent = result.message; };
window.draftcraftSettings.status().then(show);
document.getElementById('settings').addEventListener('submit', async (event) => {
  event.preventDefault();
  show(await window.draftcraftSettings.save(keyInput.value));
  keyInput.value = '';
});
document.getElementById('remove').addEventListener('click', async () => {
  show(await window.draftcraftSettings.clear());
  keyInput.value = '';
});
document.getElementById('done').addEventListener('click', () => window.draftcraftSettings.close());
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') window.draftcraftSettings.close(); });
