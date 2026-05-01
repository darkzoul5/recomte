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

  const passwordInput = document.getElementById('admin-password');
  const capsLockHint = document.getElementById('caps-lock-hint');
  if (passwordInput && capsLockHint) {
    const updateCapsLockHint = (event) => {
      const isCapsLockOn = event.getModifierState?.('CapsLock') || false;
      capsLockHint.hidden = !isCapsLockOn;
    };

    passwordInput.addEventListener('keydown', updateCapsLockHint);
    passwordInput.addEventListener('keyup', updateCapsLockHint);
    passwordInput.addEventListener('blur', () => {
      capsLockHint.hidden = true;
    });
  }
});
