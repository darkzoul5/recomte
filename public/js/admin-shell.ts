document.addEventListener('DOMContentLoaded', () => {
  const body = document.body;
  document.querySelectorAll<HTMLElement>('.navbar-burger').forEach((burger) => {
    burger.addEventListener('click', () => {
      const targetId = burger.dataset.target;
      const target = targetId ? document.getElementById(targetId) : null;

      burger.classList.toggle('is-active');
      target?.classList.toggle('is-active');
    });
  });

  document.querySelectorAll<HTMLElement>('.error-message .delete, .admin-error .delete').forEach((button) => {
    button.addEventListener('click', (event) => {
      (event.target as HTMLElement | null)?.closest('.error-message, .admin-error')?.remove();
    });
  });

  const passwordInput = document.getElementById('admin-password') as HTMLInputElement | null;
  const capsLockHint = document.getElementById('caps-lock-hint') as HTMLElement | null;
  if (passwordInput && capsLockHint) {
    const updateCapsLockHint = (event: KeyboardEvent) => {
      const isCapsLockOn = event.getModifierState?.('CapsLock') || false;
      capsLockHint.hidden = !isCapsLockOn;
    };

    passwordInput.addEventListener('keydown', updateCapsLockHint);
    passwordInput.addEventListener('keyup', updateCapsLockHint);
    passwordInput.addEventListener('blur', () => {
      capsLockHint.hidden = true;
    });
  }

  const homeLink = document.getElementById('adminHomeLink') as HTMLAnchorElement | null;
  const mainSiteLink = document.getElementById('openMainSiteFrameLink') as HTMLAnchorElement | null;
  const mainSiteFrameWrap = document.getElementById('adminSiteFrame') as HTMLElement | null;
  const mainSiteFrame = document.getElementById('mainSiteFrame') as HTMLIFrameElement | null;
  const reloadMainSiteFrameBtn = document.getElementById('reloadMainSiteFrameBtn') as HTMLButtonElement | null;
  const openMainSiteTabLink = document.getElementById('openMainSiteTabLink') as HTMLAnchorElement | null;

  const getMainSiteUrl = () => (
    mainSiteLink?.getAttribute('href')
    || openMainSiteTabLink?.getAttribute('href')
    || '/'
  );

  const setFrameOpen = (isOpen: boolean) => {
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
