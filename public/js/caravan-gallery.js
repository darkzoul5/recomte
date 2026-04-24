function initializeCaravanGallery() {
  const galleryRoot = document.querySelector('[data-caravan-gallery]');
  const dataScript = document.getElementById('caravanImagesData');
  const mainImage = galleryRoot?.querySelector('[data-gallery-main-image]');
  const prevButton = galleryRoot?.querySelector('[data-gallery-prev]');
  const nextButton = galleryRoot?.querySelector('[data-gallery-next]');
  const openButton = galleryRoot?.querySelector('[data-gallery-open]');
  const thumbnailsContainer = galleryRoot?.querySelector('[data-gallery-thumbnails]');

  if (!galleryRoot || !mainImage || !thumbnailsContainer) return;

  let images = [];
  if (dataScript) {
    try {
      images = JSON.parse(dataScript.textContent || '[]');
    } catch {
      images = [];
    }
  }

  if (!Array.isArray(images) || images.length === 0) {
    images = [{
      url: mainImage.getAttribute('src'),
      alt: mainImage.getAttribute('alt') || 'Изображение',
      title: mainImage.getAttribute('alt') || 'Изображение'
    }];
  }

  let currentIndex = 0;
  let lightboxIndex = 0;
  let zoom = 1;
  let panX = 0;
  let panY = 0;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let startPanX = 0;
  let startPanY = 0;
  let touchStartX = 0;
  let touchStartY = 0;
  let lightboxTouchStartX = 0;
  let lightboxTouchStartY = 0;
  let pinchStartDistance = 0;
  let pinchStartZoom = 1;
  let pinchCenterX = 0;
  let pinchCenterY = 0;
  let zoomOriginX = 0;
  let zoomOriginY = 0;
  let activePointerId = null;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const lightbox = document.createElement('div');
  lightbox.className = 'caravan-lightbox';
  lightbox.innerHTML = `
    <div class="caravan-lightbox__backdrop" data-lightbox-close></div>
    <div class="caravan-lightbox__panel" role="dialog" aria-modal="true" aria-label="Просмотр изображения">
      <button type="button" class="caravan-lightbox__close" data-lightbox-close aria-label="Закрыть"><i class="fas fa-times"></i></button>
      <button type="button" class="caravan-lightbox__nav caravan-lightbox__nav--prev" data-lightbox-prev aria-label="Предыдущее изображение"><i class="fas fa-chevron-left"></i></button>
      <button type="button" class="caravan-lightbox__nav caravan-lightbox__nav--next" data-lightbox-next aria-label="Следующее изображение"><i class="fas fa-chevron-right"></i></button>
      <div class="caravan-lightbox__stage">
        <img class="caravan-lightbox__image" data-lightbox-image alt="">
      </div>
      <div class="caravan-lightbox__toolbar">
        <button type="button" class="button is-small" data-zoom-out aria-label="Уменьшить"><i class="fas fa-search-minus"></i></button>
        <button type="button" class="button is-small" data-zoom-reset aria-label="Сбросить масштаб">100%</button>
        <button type="button" class="button is-small" data-zoom-in aria-label="Увеличить"><i class="fas fa-search-plus"></i></button>
      </div>
    </div>
  `;
  document.body.appendChild(lightbox);

  const lightboxImage = lightbox.querySelector('[data-lightbox-image]');
  const lightboxPrev = lightbox.querySelector('[data-lightbox-prev]');
  const lightboxNext = lightbox.querySelector('[data-lightbox-next]');
  const zoomInBtn = lightbox.querySelector('[data-zoom-in]');
  const zoomOutBtn = lightbox.querySelector('[data-zoom-out]');
  const zoomResetBtn = lightbox.querySelector('[data-zoom-reset]');
  const closeButtons = lightbox.querySelectorAll('[data-lightbox-close]');
  const lightboxStage = lightbox.querySelector('.caravan-lightbox__stage');

  const renderMainImage = (index) => {
    const image = images[index];
    if (!image) return;

    currentIndex = index;
    mainImage.src = image.url;
    mainImage.alt = image.alt || image.title || 'Изображение';

    const thumbnailButtons = thumbnailsContainer.querySelectorAll('[data-gallery-thumb]');
    thumbnailButtons.forEach((button, thumbIndex) => {
      button.classList.toggle('is-active', thumbIndex === index);
      button.setAttribute('aria-current', thumbIndex === index ? 'true' : 'false');
    });
  };

  const updateLightboxImage = () => {
    const image = images[lightboxIndex];
    if (!image) return;

    lightboxImage.src = image.url;
    lightboxImage.alt = image.alt || image.title || 'Изображение';
    lightboxImage.style.transformOrigin = `${zoomOriginX}px ${zoomOriginY}px`;
    lightboxImage.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
    zoomResetBtn.textContent = `${Math.round(zoom * 100)}%`;
  };

  const resetPan = () => {
    panX = 0;
    panY = 0;
  };

  const getStagePoint = (clientX, clientY) => {
    const rect = lightboxStage.getBoundingClientRect();
    return {
      x: clamp(clientX - rect.left, 0, rect.width),
      y: clamp(clientY - rect.top, 0, rect.height)
    };
  };

  const applyZoom = (nextZoom, focalPoint = null) => {
    if (focalPoint) {
      zoomOriginX = focalPoint.x;
      zoomOriginY = focalPoint.y;
    }
    zoom = clamp(nextZoom, 1, 4);
    if (zoom === 1) {
      resetPan();
      const center = getStagePoint(lightboxStage.getBoundingClientRect().left + lightboxStage.clientWidth / 2, lightboxStage.getBoundingClientRect().top + lightboxStage.clientHeight / 2);
      zoomOriginX = center.x;
      zoomOriginY = center.y;
    }
    updateLightboxImage();
  };

  const zoomAt = (clientX, clientY, deltaZoom) => {
    applyZoom(zoom + deltaZoom, getStagePoint(clientX, clientY));
  };

  const zoomToCenter = (deltaZoom) => {
    const rect = lightboxStage.getBoundingClientRect();
    applyZoom(zoom + deltaZoom, {
      x: rect.width / 2,
      y: rect.height / 2
    });
  };

  const openLightbox = (index) => {
    lightboxIndex = index;
    zoom = 1;
    resetPan();
    updateLightboxImage();
    lightbox.classList.add('is-open');
    document.documentElement.classList.add('is-lightbox-open');
    document.body.classList.add('is-lightbox-open');

    window.requestAnimationFrame(() => {
      const rect = lightboxStage.getBoundingClientRect();
      zoomOriginX = rect.width / 2;
      zoomOriginY = rect.height / 2;
      updateLightboxImage();
    });
  };

  const closeLightbox = () => {
    lightbox.classList.remove('is-open');
    document.documentElement.classList.remove('is-lightbox-open');
    document.body.classList.remove('is-lightbox-open');
  };

  const goToImage = (direction) => {
    const nextIndex = (currentIndex + direction + images.length) % images.length;
    renderMainImage(nextIndex);
  };

  const goToLightboxImage = (direction) => {
    lightboxIndex = (lightboxIndex + direction + images.length) % images.length;
    zoom = 1;
    resetPan();
    updateLightboxImage();
  };

  const renderThumbnails = () => {
    thumbnailsContainer.innerHTML = '';

    images.forEach((image, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'caravan-gallery__thumb';
      button.setAttribute('data-gallery-thumb', '1');
      button.setAttribute('aria-label', `Показать изображение ${index + 1}`);
      button.innerHTML = `
        <img src="${image.url}" alt="${image.alt || image.title || 'Изображение'}">
      `;
      if (index === currentIndex) {
        button.classList.add('is-active');
        button.setAttribute('aria-current', 'true');
      }
      button.addEventListener('click', () => renderMainImage(index));
      thumbnailsContainer.appendChild(button);
    });
  };

  renderThumbnails();
  renderMainImage(0);

  prevButton?.addEventListener('click', () => goToImage(-1));
  nextButton?.addEventListener('click', () => goToImage(1));
  openButton?.addEventListener('click', () => openLightbox(currentIndex));

  lightboxPrev?.addEventListener('click', () => goToLightboxImage(-1));
  lightboxNext?.addEventListener('click', () => goToLightboxImage(1));
  zoomInBtn?.addEventListener('click', () => zoomToCenter(0.25));
  zoomOutBtn?.addEventListener('click', () => zoomToCenter(-0.25));
  zoomResetBtn?.addEventListener('click', () => {
    zoom = 1;
    resetPan();
    const rect = lightboxStage.getBoundingClientRect();
    zoomOriginX = rect.width / 2;
    zoomOriginY = rect.height / 2;
    updateLightboxImage();
  });
  closeButtons.forEach((button) => button.addEventListener('click', closeLightbox));

  lightbox.addEventListener('click', (event) => {
    if (event.target === lightbox) closeLightbox();
  });

  mainImage.addEventListener('click', () => openLightbox(currentIndex));

  mainImage.addEventListener('touchstart', (event) => {
    if (!event.touches || event.touches.length !== 1) return;
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
  }, { passive: true });

  mainImage.addEventListener('touchend', (event) => {
    if (!event.changedTouches || event.changedTouches.length !== 1) return;
    const deltaX = event.changedTouches[0].clientX - touchStartX;
    const deltaY = event.changedTouches[0].clientY - touchStartY;
    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
      goToImage(deltaX < 0 ? 1 : -1);
    }
  }, { passive: true });

  lightbox.addEventListener('touchstart', (event) => {
    if (!lightbox.classList.contains('is-open')) return;
    if (event.touches.length === 1) {
      lightboxTouchStartX = event.touches[0].clientX;
      lightboxTouchStartY = event.touches[0].clientY;
    } else if (event.touches.length === 2) {
      const [first, second] = event.touches;
      lightboxTouchStartDistance = Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
      startZoom = zoom;
    }
  }, { passive: true });

  lightbox.addEventListener('touchmove', (event) => {
    if (!lightbox.classList.contains('is-open')) return;

    if (event.touches.length === 1 && zoom > 1 && isDragging) {
      const dx = event.touches[0].clientX - dragStartX;
      const dy = event.touches[0].clientY - dragStartY;
      panX = startPanX + dx;
      panY = startPanY + dy;
      updateLightboxImage();
    }
  }, { passive: true });

  lightboxStage.addEventListener('pointerdown', (event) => {
    if (zoom <= 1) return;
    isDragging = true;
    activePointerId = event.pointerId;
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    startPanX = panX;
    startPanY = panY;
    lightboxStage.setPointerCapture(event.pointerId);
  });

  lightboxStage.addEventListener('pointermove', (event) => {
    if (!isDragging || event.pointerId !== activePointerId || zoom <= 1) return;
    panX = startPanX + (event.clientX - dragStartX);
    panY = startPanY + (event.clientY - dragStartY);
    updateLightboxImage();
  });

  const stopDragging = (event) => {
    if (event.pointerId !== activePointerId) return;
    isDragging = false;
    activePointerId = null;
  };

  lightboxStage.addEventListener('pointerup', stopDragging);
  lightboxStage.addEventListener('pointercancel', stopDragging);

  lightboxStage.addEventListener('wheel', (event) => {
    if (!lightbox.classList.contains('is-open')) return;
    event.preventDefault();
    const nextZoom = event.deltaY < 0 ? zoom + 0.15 : zoom - 0.15;
    zoomAt(event.clientX, event.clientY, event.deltaY < 0 ? 0.15 : -0.15);
  }, { passive: false });

  lightboxStage.addEventListener('touchstart', (event) => {
    if (!lightbox.classList.contains('is-open')) return;

    if (event.touches.length === 2) {
      const [first, second] = event.touches;
      pinchStartDistance = Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
      pinchStartZoom = zoom;
      pinchCenterX = (first.clientX + second.clientX) / 2;
      pinchCenterY = (first.clientY + second.clientY) / 2;
      isDragging = false;
      event.preventDefault();
    }
  }, { passive: false });

  lightboxStage.addEventListener('touchmove', (event) => {
    if (!lightbox.classList.contains('is-open')) return;

    if (event.touches.length === 2 && pinchStartDistance > 0) {
      const [first, second] = event.touches;
      const currentDistance = Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
      const nextZoom = pinchStartZoom * (currentDistance / pinchStartDistance);
      zoomAt(pinchCenterX, pinchCenterY, nextZoom - zoom);
      event.preventDefault();
      return;
    }

    if (event.touches.length === 1 && zoom > 1 && isDragging) {
      const dx = event.touches[0].clientX - dragStartX;
      const dy = event.touches[0].clientY - dragStartY;
      panX = startPanX + dx;
      panY = startPanY + dy;
      updateLightboxImage();
    }
  }, { passive: false });

  lightboxStage.addEventListener('touchend', (event) => {
    if (event.touches.length < 2) {
      pinchStartDistance = 0;
      pinchStartZoom = zoom;
    }
  }, { passive: true });

  document.addEventListener('keydown', (event) => {
    if (!lightbox.classList.contains('is-open')) {
      return;
    }

    if (event.key === 'Escape') {
      closeLightbox();
    }

    if (event.key === 'ArrowLeft') {
      goToLightboxImage(-1);
    }

    if (event.key === 'ArrowRight') {
      goToLightboxImage(1);
    }
  });

  if (images.length > 1) {
    let swipeStartX = 0;
    let swipeStartY = 0;

    const handleSwipeStart = (event) => {
      if (!event.touches || event.touches.length !== 1) return;
      swipeStartX = event.touches[0].clientX;
      swipeStartY = event.touches[0].clientY;
    };

    const handleSwipeEnd = (event) => {
      if (!event.changedTouches || event.changedTouches.length !== 1) return;
      const deltaX = event.changedTouches[0].clientX - swipeStartX;
      const deltaY = event.changedTouches[0].clientY - swipeStartY;
      if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
        goToImage(deltaX < 0 ? 1 : -1);
      }
    };

    mainImage.addEventListener('touchstart', handleSwipeStart, { passive: true });
    mainImage.addEventListener('touchend', handleSwipeEnd, { passive: true });
  }

  window.addEventListener('resize', () => {
    updateLightboxImage();
  });
}

document.addEventListener('DOMContentLoaded', initializeCaravanGallery);
