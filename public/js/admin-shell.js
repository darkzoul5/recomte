document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.navbar-burger').forEach((burger) => {
    burger.addEventListener('click', () => {
      const targetId = burger.dataset.target;
      const target = targetId ? document.getElementById(targetId) : null;

      burger.classList.toggle('is-active');
      target?.classList.toggle('is-active');
    });
  });

  document.querySelectorAll('.error-message .delete, .admin-error .delete').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.target.closest('.error-message, .admin-error')?.remove();
    });
  });
});