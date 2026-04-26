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

    adminForm.addEventListener('submit', async function(event) {
      if (isSubmittingAfterReorder) {
        localStorage.setItem('adminEditScrollPosition', window.scrollY);
        return;
      }

      event.preventDefault();
      updateImageOrderInput();
      await persistImageOrderViaApi();
      localStorage.setItem('adminEditScrollPosition', window.scrollY);

      isSubmittingAfterReorder = true;
      adminForm.requestSubmit();
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
    let draggedCard = null;

    const cards = imagesGrid.querySelectorAll('.image-card');
    cards.forEach((card) => {
      card.addEventListener('dragstart', (event) => {
        draggedCard = card;
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', card.getAttribute('data-image-id') || '');
        card.style.opacity = '0.4';
      });

      card.addEventListener('dragend', () => {
        card.style.opacity = '';
        updateImageOrderInput();
        draggedCard = null;
      });

      card.addEventListener('dragover', (event) => {
        event.preventDefault();
        if (!draggedCard || draggedCard === card) return;

        const rect = card.getBoundingClientRect();
        const shouldInsertAfter = event.clientY > rect.top + rect.height / 2;
        if (shouldInsertAfter) {
          if (card.nextSibling !== draggedCard) {
            imagesGrid.insertBefore(draggedCard, card.nextSibling);
          }
        } else {
          imagesGrid.insertBefore(draggedCard, card);
        }
      });

      card.addEventListener('drop', (event) => {
        event.preventDefault();
        updateImageOrderInput();
      });
    });

    imagesGrid.addEventListener('dragover', (event) => {
      event.preventDefault();
    });

    imagesGrid.addEventListener('drop', (event) => {
      event.preventDefault();
      if (!draggedCard) return;

      const targetCard = event.target.closest('.image-card');
      if (!targetCard) {
        imagesGrid.appendChild(draggedCard);
      }

      updateImageOrderInput();
    });

    updateImageOrderInput();
  }

  // Update file label with selected file count
  const fileInput = document.getElementById('fileInput');
  const fileLabel = document.querySelector('.file-input-label');
  if (fileInput && fileLabel) {
    fileInput.addEventListener('change', function(e) {
      const count = this.files.length;
      if (count > 0) {
        fileLabel.innerHTML = `<i class="fas fa-check"></i> Выбрано ${count} файл(ов)`;
      } else {
        fileLabel.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Выбрать файлы';
      }
    });
  }

  // Attach close handlers to error messages
  document.querySelectorAll('.admin-error .delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.target.closest('.admin-error')?.remove();
    });
  });

  const customFeatureKey = document.getElementById('customFeatureKey');
  const customFeatureValue = document.getElementById('customFeatureValue');
  const addCustomFeatureBtn = document.getElementById('addCustomFeatureBtn');
  const customFeaturesJson = document.getElementById('customFeaturesJson');
  const customFeaturesList = document.getElementById('customFeaturesList');

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

  const renderCustomFeatures = () => {
    if (!customFeaturesList) return;

    const items = readCustomFeatures();
    customFeaturesList.innerHTML = '';

    items.forEach((item) => {
      const row = document.createElement('div');
      row.className = 'custom-feature-item';
      row.dataset.key = item.key;
      row.innerHTML = `
        <span><strong>${item.key}</strong>: ${item.value}</span>
        <button type="button" class="button is-small is-danger is-light custom-feature-remove">Удалить</button>
      `;
      customFeaturesList.appendChild(row);
    });

    customFeaturesList.querySelectorAll('.custom-feature-remove').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.closest('.custom-feature-item')?.dataset.key;
        if (!key) return;
        const nextItems = readCustomFeatures().filter((item) => item.key !== key);
        writeCustomFeatures(nextItems);
        renderCustomFeatures();
      });
    });
  };

  if (addCustomFeatureBtn && customFeatureKey && customFeatureValue) {
    addCustomFeatureBtn.addEventListener('click', () => {
      const key = customFeatureKey.value.trim();
      const value = customFeatureValue.value.trim();

      if (!key) {
        customFeatureKey.focus();
        return;
      }

      const currentItems = readCustomFeatures().filter((item) => item.key !== key);
      currentItems.push({ key, value: value || '1' });
      writeCustomFeatures(currentItems);
      renderCustomFeatures();

      customFeatureKey.value = '';
      customFeatureValue.value = '';
      customFeatureKey.focus();
    });

    [customFeatureKey, customFeatureValue].forEach((input) => {
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          addCustomFeatureBtn.click();
        }
      });
    });
  }

  renderCustomFeatures();

  const grossWeightInput = document.getElementById('grossWeightInput');
  const towVehicleMaxInput = document.getElementById('towVehicleMaxInput');

  const updateTowVehicleMax = () => {
    if (!grossWeightInput || !towVehicleMaxInput) return;
    const grossWeight = parseInt(grossWeightInput.value, 10);
    if (Number.isNaN(grossWeight)) {
      towVehicleMaxInput.value = '';
      return;
    }
    towVehicleMaxInput.value = Math.max(0, 3500 - grossWeight);
  };

  if (grossWeightInput && towVehicleMaxInput) {
    grossWeightInput.addEventListener('input', updateTowVehicleMax);
    if (!towVehicleMaxInput.value) {
      updateTowVehicleMax();
    }
  }
});
