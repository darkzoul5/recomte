document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.delete-form').forEach(form => {
    form.addEventListener('submit', (e) => {
      if (!confirm('Вы уверены?')) {
        e.preventDefault();
      }
    });
  });
});
