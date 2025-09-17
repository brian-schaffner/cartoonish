const form = document.getElementById('caricature-form');
const textarea = document.getElementById('names');
const results = document.getElementById('results');
const errorBox = document.getElementById('error');
const cardTemplate = document.getElementById('card-template');

function parseNames(value) {
  if (!value) return [];
  return value
    .split(/[,\n]/)
    .map((name) => name.trim())
    .filter(Boolean);
}

function createCard(name) {
  const fragment = cardTemplate.content.cloneNode(true);
  const card = fragment.querySelector('.card');
  card.querySelector('.name').textContent = name;
  results.appendChild(fragment);
  return card;
}

function setCardStatus(card, text) {
  const status = card.querySelector('.status');
  if (status) {
    status.textContent = text;
  }
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove('hidden');
}

function clearError() {
  errorBox.textContent = '';
  errorBox.classList.add('hidden');
}

async function requestCaricatures(names) {
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ names })
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || 'Request failed.');
  }

  return response.json();
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearError();

  const names = parseNames(textarea.value);
  results.innerHTML = '';

  if (!names.length) {
    showError('Please enter at least one name.');
    return;
  }

  const cards = names.map((name) => {
    const card = createCard(name);
    setCardStatus(card, 'Working…');
    return { name, card };
  });

  form.querySelector('button').disabled = true;

  try {
    const { results: payload } = await requestCaricatures(names);
    const byName = new Map(payload.map((item) => [item.name, item]));

    cards.forEach(({ name, card }) => {
      const info = byName.get(name);
      if (!info) {
        setCardStatus(card, 'No image returned');
        return;
      }

      const img = document.createElement('img');
      img.alt = `${name} caricature`;
      img.src = `data:image/png;base64,${info.imageBase64}`;

      const placeholder = card.querySelector('.placeholder');
      placeholder.replaceWith(img);

      const prompt = card.querySelector('.prompt');
      if (info.revisedPrompt) {
        prompt.textContent = info.revisedPrompt;
        prompt.classList.remove('hidden');
      }
    });
  } catch (error) {
    showError(error.message);
    cards.forEach(({ card }) => setCardStatus(card, 'Failed'));
  } finally {
    form.querySelector('button').disabled = false;
  }
});
