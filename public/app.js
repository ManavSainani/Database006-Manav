const list = document.querySelector('#painting-list');
const listMessage = document.querySelector('#list-message');
const count = document.querySelector('#painting-count');
const search = document.querySelector('#search');
const form = document.querySelector('#painting-form');
const emptyState = document.querySelector('#empty-state');
const heading = document.querySelector('#editor-heading');
const previewImage = document.querySelector('#preview-image');
const previewCaption = document.querySelector('#preview-caption');
const saveMessage = document.querySelector('#save-message');
const resetButton = document.querySelector('#reset-button');

const fields = ['Title', 'YearOfWork', 'Medium', 'Description', 'Width', 'Height', 'Cost', 'MSRP'];
const paintingsById = new Map();
let selectedId = null;

function imageUrl(filename) {
  return `/art/works/square-medium/${encodeURIComponent(filename)}.jpg`;
}

function setImageFallback(image) {
  image.addEventListener('error', () => {
    image.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect width="400" height="300" fill="%23e8e2d7"/%3E%3Cpath d="M145 205l43-54 32 37 25-29 43 46H145z" fill="%23b7aa96"/%3E%3Ccircle cx="170" cy="107" r="16" fill="%23b7aa96"/%3E%3C/svg%3E';
    image.removeAttribute('data-fallback-pending');
  }, { once: true });
}

function selectPainting(painting) {
  selectedId = painting.PaintingID;
  heading.textContent = painting.Title;
  previewCaption.textContent = `Record #${painting.PaintingID}`;
  previewImage.src = imageUrl(painting.ImageFileName);
  previewImage.alt = painting.Title;
  previewImage.dataset.fallbackPending = 'true';
  setImageFallback(previewImage);

  for (const field of fields) {
    form.elements[field].value = painting[field] ?? '';
  }

  form.dataset.original = JSON.stringify(painting);
  form.hidden = false;
  emptyState.hidden = true;
  saveMessage.textContent = '';
  renderList(search.value);
}

function renderList(query = '') {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const matches = [...paintingsById.values()].filter((painting) =>
    painting.Title.toLocaleLowerCase().includes(normalizedQuery)
  );

  list.replaceChildren();
  listMessage.hidden = matches.length > 0;
  if (matches.length === 0) {
    listMessage.textContent = paintingsById.size ? 'No paintings match that search.' : 'No paintings are available.';
  }

  for (const painting of matches) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `painting-item${painting.PaintingID === selectedId ? ' is-selected' : ''}`;
    button.setAttribute('aria-pressed', String(painting.PaintingID === selectedId));
    button.addEventListener('click', () => selectPainting(painting));

    const image = document.createElement('img');
    image.className = 'painting-thumb';
    image.src = imageUrl(painting.ImageFileName);
    image.alt = '';
    image.loading = 'lazy';
    setImageFallback(image);

    const details = document.createElement('span');
    details.className = 'painting-item-copy';
    const title = document.createElement('span');
    title.className = 'painting-title';
    title.textContent = painting.Title;
    const meta = document.createElement('span');
    meta.className = 'painting-meta';
    meta.textContent = [painting.YearOfWork, painting.Medium].filter(Boolean).join(' · ') || 'Artwork record';
    const arrow = document.createElement('span');
    arrow.className = 'painting-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '↗';

    details.append(title, meta);
    button.append(image, details, arrow);
    list.append(button);
  }
}

async function loadPaintings() {
  try {
    const response = await fetch('/api/paintings');
    if (!response.ok) throw new Error('The painting list could not be loaded.');
    const paintings = await response.json();
    for (const painting of paintings) paintingsById.set(painting.PaintingID, painting);
    count.textContent = `${paintings.length} works`;
    listMessage.hidden = true;
    renderList();
  } catch (error) {
    count.textContent = 'Unavailable';
    listMessage.textContent = `${error.message} Make sure the server is running.`;
  }
}

search.addEventListener('input', () => renderList(search.value));

form.addEventListener('reset', () => {
  const original = JSON.parse(form.dataset.original || 'null');
  if (!original) return;
  requestAnimationFrame(() => {
    for (const field of fields) form.elements[field].value = original[field] ?? '';
    saveMessage.textContent = '';
  });
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (selectedId === null) return;

  const payload = Object.fromEntries(fields.map((field) => [field, form.elements[field].value]));
  const submitButton = form.querySelector('[type="submit"]');
  submitButton.disabled = true;
  saveMessage.textContent = 'Saving…';

  try {
    const response = await fetch(`/api/paintings/${selectedId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'The changes could not be saved.');
    paintingsById.set(result.PaintingID, result);
    form.dataset.original = JSON.stringify(result);
    selectPainting(result);
    saveMessage.textContent = 'Changes saved to the database.';
  } catch (error) {
    saveMessage.textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
});

resetButton.addEventListener('click', () => {
  requestAnimationFrame(() => renderList(search.value));
});

loadPaintings();
