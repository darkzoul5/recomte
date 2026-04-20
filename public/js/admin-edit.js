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
  // Attach click handlers to delete buttons
  document.querySelectorAll('.delete-image-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      const imageId = this.getAttribute('data-image-id');
      toggleImageDelete(imageId);
    });
  });

  // Attach click handlers to unmark buttons
  document.querySelectorAll('.unmark-delete-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      const imageId = this.getAttribute('data-image-id');
      toggleImageDelete(imageId);
    });
  });

  // Attach close handlers to error messages
  document.querySelectorAll('.admin-error .delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.target.closest('.admin-error')?.remove();
    });
  });
});
