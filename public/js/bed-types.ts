const BED_OPTIONS = [
  { value: 'bunk', label: 'Двухъярусная' },
  { value: 'twin', label: 'Две отдельные' },
  { value: 'dinette', label: 'Трансформер из стола' },
  { value: 'double', label: 'Двухместная' }
];
const MAX_BED_ROWS = 4;

function parseBedTypes() {
  const input = document.getElementById('bedTypesInput') as HTMLInputElement | null;
  if (!input) return [];

  try {
    const parsed = JSON.parse(input.value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function createBedRow(selectedValue, index) {
  const row = document.createElement('div');
  row.className = 'bed-row';
  row.dataset.index = String(index);
  row.style.cssText = 'display: flex; gap: 0.5rem; align-items: center;';

  const select = document.createElement('select');
  select.className = 'select';
  select.setAttribute('data-bed-select', '1');
  select.style.cssText = 'flex: 1; min-height: 44px;';

  const emptyOption = document.createElement('option');
  emptyOption.value = '';
  emptyOption.textContent = 'Выбрать тип кровати...';
  select.appendChild(emptyOption);

  BED_OPTIONS.forEach((option) => {
    const opt = document.createElement('option');
    opt.value = option.value;
    opt.textContent = option.label;
    if (selectedValue === option.value) {
      opt.selected = true;
    }
    select.appendChild(opt);
  });

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'button is-danger is-light is-small';
  removeBtn.setAttribute('data-remove-bed', '1');
  removeBtn.setAttribute('aria-label', 'Удалить кровать');
  removeBtn.innerHTML = '<span class="icon"><i class="fas fa-trash"></i></span>';

  row.appendChild(select);
  row.appendChild(removeBtn);
  return row;
}

function renderBedRows(values) {
  const container = document.getElementById('bedTypesContainer');
  if (!container) return;

  container.innerHTML = '';
  values.slice(0, MAX_BED_ROWS).forEach((value, index) => {
    container.appendChild(createBedRow(value, index));
  });
}

function syncAddButtonState() {
  const addBtn = document.getElementById('addBedRowBtn');
  if (!addBtn) return;

  const currentCount = getCurrentBedValuesRaw().length;
  addBtn.style.display = currentCount >= MAX_BED_ROWS ? 'none' : '';
}

function getCurrentBedValues() {
  const container = document.getElementById('bedTypesContainer');
  if (!container) return [];

  return Array.from(container.querySelectorAll('select[data-bed-select="1"]'))
    .map((select) => (select as HTMLSelectElement).value)
    .filter(Boolean);
}

function getCurrentBedValuesRaw() {
  const container = document.getElementById('bedTypesContainer');
  if (!container) return [];

  return Array.from(container.querySelectorAll('select[data-bed-select="1"]')).map((select) => (select as HTMLSelectElement).value);
}

document.addEventListener('DOMContentLoaded', function() {
  const container = document.getElementById('bedTypesContainer');
  const addBtn = document.getElementById('addBedRowBtn');
  const form = document.querySelector('.admin-form');
  const hiddenInput = document.getElementById('bedTypesInput') as HTMLInputElement | null;
  if (!container || !addBtn || !form || !hiddenInput) return;

  const initialValues = parseBedTypes();
  if (initialValues.length > 0) {
    renderBedRows(initialValues);
  } else {
    renderBedRows(['']);
  }
  syncAddButtonState();

  addBtn.addEventListener('click', function() {
    const values = getCurrentBedValuesRaw();
    if (values.length >= MAX_BED_ROWS) return;
    values.push('');
    renderBedRows(values);
    syncAddButtonState();
  });

  container.addEventListener('click', function(event) {
    const removeButton = (event.target as HTMLElement | null)?.closest('[data-remove-bed="1"]');
    if (!removeButton) return;

    const row = removeButton.closest('.bed-row') as HTMLElement | null;
    if (!row) return;

    const rowIndex = Number(row.dataset.index);
    const currentRaw = Array.from(container.querySelectorAll('select[data-bed-select="1"]')).map((select) => (select as HTMLSelectElement).value);
    currentRaw.splice(rowIndex, 1);
    renderBedRows(currentRaw);
    syncAddButtonState();
  });

  form.addEventListener('submit', function() {
    hiddenInput.value = JSON.stringify(getCurrentBedValues());
  });
});
