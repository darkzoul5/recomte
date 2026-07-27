// Toggle image deletion marking
function toggleImageDelete(imageId) {
  const imageCard = document.querySelector(`.image-card[data-image-id="${imageId}"]`) as HTMLElement | null;
  const deleteInput = document.querySelector(`.image-delete-input[data-image-id="${imageId}"]`) as HTMLInputElement | null;
  if (!imageCard || !deleteInput) return;
  const deleteMarker = imageCard.querySelector('.delete-marker') as HTMLElement | null;
  const deleteBtn = imageCard.querySelector('.delete-image-btn') as HTMLButtonElement | null;
  if (!deleteMarker || !deleteBtn) return;
  
  // Toggle the disabled attribute - only enabled inputs are submitted
  if (deleteInput.disabled) {
    // Mark for deletion - enable the input
    deleteInput.disabled = false;
    deleteMarker.style.display = 'flex';
    imageCard.style.opacity = '0.5';
    deleteBtn.classList.remove('is-danger');
    deleteBtn.classList.add('is-success');
    deleteBtn.innerHTML = '<i class="fas fa-undo"></i>';
  } else {
    // Unmark for deletion - disable the input
    deleteInput.disabled = true;
    deleteMarker.style.display = 'none';
    imageCard.style.opacity = '1';
    deleteBtn.classList.remove('is-success');
    deleteBtn.classList.add('is-danger');
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
  }

  updateImageOrderInput();
}

function updateImageOrderInput() {
  const orderInput = document.getElementById('imageOrderInput') as HTMLInputElement | null;
  const grid = document.getElementById('imagesGrid') as HTMLElement | null;
  if (!orderInput || !grid) return;

  const ids = Array.from(grid.querySelectorAll<HTMLElement>('.image-card'))
    .filter((card) => {
      const imageId = card.getAttribute('data-image-id');
      const deleteInput = document.querySelector(`.image-delete-input[data-image-id="${imageId}"]`) as HTMLInputElement | null;
      return deleteInput ? deleteInput.disabled : true;
    })
    .map((card) => card.getAttribute('data-image-id'))
    .filter(Boolean);

  orderInput.value = ids.join(',');
}

function initializeImageSortable(grid) {
  if (!grid || !window.Sortable) return;

  window.Sortable.create(grid, {
    animation: 150,
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    dragClass: 'sortable-drag',
    dataIdAttr: 'data-image-id',
    draggable: '.image-card[data-image-id]',
    handle: '.drag-handle',
    filter: '.delete-image-btn, .delete-marker',
    preventOnFilter: true,
    onEnd: () => {
      updateImageOrderInput();
    }
  });
}

// Initialize event listeners when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // Restore scroll position from localStorage
  const savedScrollPosition = localStorage.getItem('adminEditScrollPosition');
  if (savedScrollPosition) {
    window.scrollTo(0, parseInt(savedScrollPosition));
    localStorage.removeItem('adminEditScrollPosition');
  }

  // Save scroll position before form submission
  const adminForm = document.querySelector('.admin-form') as HTMLFormElement | null;
  if (adminForm) {
    let isSubmitting = false;
    let hasUnsavedChanges = false;

    const getFormSnapshot = () => {
      const state = {};

      for (const element of Array.from(adminForm.elements) as Array<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
        if (!element || !element.name || element.disabled) continue;
        if (element.name === '_csrf' || element.name === 'images' || element.name === 'images_to_delete' || element.name === 'image_order') {
          continue;
        }

        if (element instanceof HTMLInputElement) {
          if (element.type === 'file') continue;

          if (element.type === 'checkbox') {
            state[element.name] = element.checked;
            continue;
          }

          if (element.type === 'radio') {
            if (element.checked) {
              state[element.name] = element.value;
            }
            continue;
          }
        } else if (element instanceof HTMLSelectElement && element.multiple) {
          state[element.name] = Array.from(element.selectedOptions).map((option: HTMLOptionElement) => option.value);
          continue;
        }

        state[element.name] = element.value;
      }

      return JSON.stringify(state);
    };

    const serverSnapshot = getFormSnapshot();

    const evaluateUnsavedState = () => {
      hasUnsavedChanges = getFormSnapshot() !== serverSnapshot;
    };

    adminForm.addEventListener('input', evaluateUnsavedState);
    adminForm.addEventListener('change', evaluateUnsavedState);

    window.addEventListener('beforeunload', (event) => {
      evaluateUnsavedState();
      if (!isSubmitting && hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = '';
      }
    });

    // Some browsers limit beforeunload dialogs; this confirms navigation for in-page links too.
    document.addEventListener('click', (event: MouseEvent) => {
      const link = ((event.target as HTMLElement | null)?.closest('a[href]') as HTMLAnchorElement | null);
      if (!link) return;
      if (link.target === '_blank' || link.hasAttribute('download')) return;

      const href = link.getAttribute('href') || '';
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

      evaluateUnsavedState();
      if (isSubmitting || !hasUnsavedChanges) return;

      const shouldLeave = window.confirm('Есть несохраненные изменения. Покинуть страницу без сохранения?');
      if (!shouldLeave) {
        event.preventDefault();
      }
    }, true);

    adminForm.addEventListener('submit', function() {
      updateImageOrderInput();
      localStorage.setItem('adminEditScrollPosition', String(window.scrollY));
      isSubmitting = true;
    });
  }

  // Attach click handlers to delete buttons
  document.querySelectorAll<HTMLElement>('.delete-image-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      const imageId = String((this as HTMLElement).getAttribute('data-image-id') || '');
      toggleImageDelete(imageId);
    });
  });

    document.addEventListener('click', (event) => {
    const confirmButton = (event.target as HTMLElement | null)?.closest('[data-confirm]');
    if (!confirmButton) return;

    const message = confirmButton.getAttribute('data-confirm') || '';
    if (!message) return;

    if (!window.confirm(message)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

  const imagesGrid = document.getElementById('imagesGrid') as HTMLElement | null;
  if (imagesGrid) {
    initializeImageSortable(imagesGrid);
    updateImageOrderInput();
  }

  // FilePond upload queue
  const fileInput = document.getElementById('fileInput') as HTMLInputElement | null;

  if (fileInput && window.FilePond) {
    if (window.FilePondPluginImagePreview) {
      window.FilePond.registerPlugin(window.FilePondPluginImagePreview);
    }

    window.FilePond.create(fileInput, {
      allowMultiple: true,
      allowReorder: true,
      instantUpload: false,
      storeAsFile: true,
      credits: false,
      imagePreviewMaxHeight: 180,
      labelIdle: 'Перетащите изображения сюда или нажмите, чтобы выбрать',
      labelFileLoading: 'Загрузка...',
      labelFileLoadError: 'Ошибка загрузки',
      labelTapToCancel: 'Отменить',
      labelTapToRetry: 'Повторить'
    });
  }

  // Attach close handlers to error messages
  document.querySelectorAll<HTMLElement>('.admin-error .delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      (e.target as HTMLElement | null)?.closest('.admin-error')?.remove();
    });
  });

  const customFeatureLabel = document.getElementById('customFeatureLabel') as HTMLInputElement | null;
  const addCustomFeatureBtn = document.getElementById('addCustomFeatureBtn') as HTMLButtonElement | null;
  const customFeaturesJson = document.getElementById('customFeaturesJson') as HTMLInputElement | null;
  const customFeatureCheckboxes = document.getElementById('customFeatureCheckboxes') as HTMLElement | null;

  const readCustomFeatures = () => {
    if (!customFeaturesJson || !customFeaturesJson.value) return [];
    try {
      const parsed = JSON.parse(customFeaturesJson.value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const writeCustomFeatures = (items) => {
    if (!customFeaturesJson) return;
    customFeaturesJson.value = JSON.stringify(items);
  };

  const renderCustomCheckboxes = () => {
    if (!customFeatureCheckboxes) return;
    const items = readCustomFeatures();
    customFeatureCheckboxes.innerHTML = '';

    items.forEach((item) => {
      const key = item.key;
      const checked = item.value !== undefined && item.value !== null && String(item.value) !== '0';

      const row = document.createElement('label');
      row.className = 'custom-feature-checkbox-row';
      row.dataset.key = key;
      row.innerHTML = `
        <input type="checkbox" class="custom-feature-checkbox" data-key="${key}" ${checked ? 'checked' : ''}>
        <span style="margin-left:0.5rem;">${key}</span>
        <button type="button" class="button is-small is-danger is-light custom-feature-remove" style="margin-left:0.75rem;">Удалить</button>
      `;

      customFeatureCheckboxes.appendChild(row);

      const checkbox = row.querySelector('.custom-feature-checkbox') as HTMLInputElement | null;
      const removeBtn = row.querySelector('.custom-feature-remove') as HTMLButtonElement | null;
      if (!checkbox || !removeBtn) return;

      checkbox.addEventListener('change', () => {
        const current = readCustomFeatures().filter((it) => it.key !== key);
        if (checkbox.checked) {
          current.push({ key, value: '1' });
        }
        writeCustomFeatures(current);
      });

      removeBtn.addEventListener('click', () => {
        const next = readCustomFeatures().filter((it) => it.key !== key);
        writeCustomFeatures(next);
        renderCustomCheckboxes();
      });
    });
  };

  if (addCustomFeatureBtn && customFeatureLabel) {
    addCustomFeatureBtn.addEventListener('click', () => {
      const label = customFeatureLabel.value.trim();
      if (!label) {
        customFeatureLabel.focus();
        return;
      }

      // sanitize a simple key representation
      const key = label.replace(/[\n\r=:/]+/g, ' ').trim();

      const existing = readCustomFeatures().filter((it) => it.key !== key);
      existing.push({ key, value: '1' });
      writeCustomFeatures(existing);
      renderCustomCheckboxes();

      customFeatureLabel.value = '';
      customFeatureLabel.focus();
    });

    customFeatureLabel.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        addCustomFeatureBtn.click();
      }
    });
  }

  renderCustomCheckboxes();

});
