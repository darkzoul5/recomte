// Toggle image deletion marking
function toggleImageDelete(imageId) {
  const imageCard = document.querySelector(`.image-card[data-image-id="${imageId}"]`);
  const deleteInput = document.querySelector(`.image-delete-input[data-image-id="${imageId}"]`);
  const deleteMarker = imageCard.querySelector('.delete-marker');
  const deleteBtn = imageCard.querySelector('.delete-image-btn');
  
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
  const orderInput = document.getElementById('imageOrderInput');
  const grid = document.getElementById('imagesGrid');
  if (!orderInput || !grid) return;

  const ids = Array.from(grid.querySelectorAll('.image-card'))
    .filter((card) => {
      const imageId = card.getAttribute('data-image-id');
      const deleteInput = document.querySelector(`.image-delete-input[data-image-id="${imageId}"]`);
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
    filter: '.delete-image-btn, .delete-marker',
    preventOnFilter: true,
    onEnd: () => {
      updateImageOrderInput();
    }
  });
}

async function persistImageOrderViaApi() {
  const orderInput = document.getElementById('imageOrderInput');
  if (!orderInput || !orderInput.value.trim()) return;

  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

  const ids = orderInput.value
    .split(',')
    .map((value) => parseInt(value, 10))
    .filter((value) => Number.isInteger(value) && value > 0);

  await Promise.all(ids.map((imageId, index) =>
    fetch(`/admin/api/images/${imageId}/reorder`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
      },
      body: JSON.stringify({ sort_order: index })
    }).catch(() => null)
  ));
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
  const adminForm = document.querySelector('.admin-form');
  if (adminForm) {
    let isSubmittingAfterReorder = false;
    let isSubmitting = false;
    let hasUnsavedChanges = false;
    let pendingSubmitter = null;

    const getFormSnapshot = () => {
      const state = {};

      for (const element of adminForm.elements) {
        if (!element || !element.name || element.disabled) continue;
        if (element.type === 'file') continue;
        if (element.name === '_csrf' || element.name === 'images' || element.name === 'images_to_delete' || element.name === 'image_order') {
          continue;
        }

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

        if (element.tagName === 'SELECT' && element.multiple) {
          state[element.name] = Array.from(element.selectedOptions).map((option) => option.value);
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
    document.addEventListener('click', (event) => {
      const link = event.target.closest('a[href]');
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

    adminForm.addEventListener('submit', async function(event) {
      if (isSubmittingAfterReorder) {
        localStorage.setItem('adminEditScrollPosition', window.scrollY);
        isSubmitting = true;
        return;
      }

      pendingSubmitter = event.submitter || document.activeElement;

      event.preventDefault();
      updateImageOrderInput();
      await persistImageOrderViaApi();
      localStorage.setItem('adminEditScrollPosition', window.scrollY);
      isSubmitting = true;

      isSubmittingAfterReorder = true;
      if (pendingSubmitter && pendingSubmitter.form === adminForm && pendingSubmitter.type === 'submit') {
        adminForm.requestSubmit(pendingSubmitter);
      } else {
        adminForm.requestSubmit();
      }
    });
  }

  // Attach click handlers to delete buttons
  document.querySelectorAll('.delete-image-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      const imageId = this.getAttribute('data-image-id');
      toggleImageDelete(imageId);
    });
  });

  const imagesGrid = document.getElementById('imagesGrid');
  if (imagesGrid) {
    initializeImageSortable(imagesGrid);
    updateImageOrderInput();
  }

  // FilePond upload queue
  const fileInput = document.getElementById('fileInput');
  let filePondInstance = null;

  if (fileInput && window.FilePond) {
    if (window.FilePondPluginImagePreview) {
      window.FilePond.registerPlugin(window.FilePondPluginImagePreview);
    }

    filePondInstance = window.FilePond.create(fileInput, {
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
  document.querySelectorAll('.admin-error .delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.target.closest('.admin-error')?.remove();
    });
  });

  const customFeatureLabel = document.getElementById('customFeatureLabel');
  const addCustomFeatureBtn = document.getElementById('addCustomFeatureBtn');
  const customFeaturesJson = document.getElementById('customFeaturesJson');
  const customFeatureCheckboxes = document.getElementById('customFeatureCheckboxes');

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

      const checkbox = row.querySelector('.custom-feature-checkbox');
      const removeBtn = row.querySelector('.custom-feature-remove');

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
      const key = label.replace(/[\n\r=:\/]+/g, ' ').trim();

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
