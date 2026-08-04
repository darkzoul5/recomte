document.addEventListener('DOMContentLoaded', () => {
  const body = document.body;
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

  const homeLink = document.getElementById('adminHomeLink');
  const mainSiteLink = document.getElementById('openMainSiteFrameLink');
  const mainSiteFrameWrap = document.getElementById('adminSiteFrame');
  const mainSiteFrame = document.getElementById('mainSiteFrame');
  const reloadMainSiteFrameBtn = document.getElementById('reloadMainSiteFrameBtn');
  const openMainSiteTabLink = document.getElementById('openMainSiteTabLink');

  const getMainSiteUrl = () => (
    mainSiteLink?.getAttribute('href')
    || openMainSiteTabLink?.getAttribute('href')
    || '/'
  );

  const setFrameOpen = (isOpen) => {
    if (!mainSiteFrameWrap) return;

    if (isOpen) {
      const targetUrl = getMainSiteUrl();
      mainSiteFrameWrap.hidden = false;
      if (!mainSiteFrame?.src || mainSiteFrame.dataset.currentUrl !== targetUrl) {
        mainSiteFrame.src = targetUrl;
        if (mainSiteFrame) {
          mainSiteFrame.dataset.currentUrl = targetUrl;
        }
      }
      body.classList.add('admin-site-frame-open');
      return;
    }

    mainSiteFrameWrap.hidden = true;
    body.classList.remove('admin-site-frame-open');
  };

  mainSiteLink?.addEventListener('click', (event) => {
    event.preventDefault();
    setFrameOpen(true);
  });

  reloadMainSiteFrameBtn?.addEventListener('click', () => {
    if (!mainSiteFrame) return;
    const targetUrl = getMainSiteUrl();
    mainSiteFrame.src = `${targetUrl}${targetUrl.includes('?') ? '&' : '?'}frame_ts=${Date.now()}`;
    mainSiteFrame.dataset.currentUrl = targetUrl;
  });

  homeLink?.addEventListener('click', (event) => {
    if (!body.classList.contains('admin-site-frame-open')) {
      return;
    }

    const isDashboard = window.location.pathname === '/admin/dash';
    if (isDashboard) {
      event.preventDefault();
      setFrameOpen(false);
    }
  });
});
