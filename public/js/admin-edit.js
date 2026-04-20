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
    adminForm.addEventListener('submit', function() {
      localStorage.setItem('adminEditScrollPosition', window.scrollY);
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
});
