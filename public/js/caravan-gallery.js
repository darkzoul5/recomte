import PhotoSwipeLightbox from '/public/vendor/photoswipe/photoswipe-lightbox.esm.min.js';

function initializeCaravanGallery() {
  const galleryRoot = document.querySelector('[data-caravan-gallery]');
  const dataScript = document.getElementById('caravanImagesData');
  const mainImage = galleryRoot?.querySelector('[data-gallery-main-image]');
  const prevButton = galleryRoot?.querySelector('[data-gallery-prev]');
  const nextButton = galleryRoot?.querySelector('[data-gallery-next]');
  const openButton = galleryRoot?.querySelector('[data-gallery-open]');
  const thumbnailsContainer = galleryRoot?.querySelector('[data-gallery-thumbnails]');
  const statusElement = galleryRoot?.querySelector('[data-gallery-status]');

  if (!galleryRoot || !mainImage || !thumbnailsContainer || !openButton) return;

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
      title: mainImage.getAttribute('alt') || 'Изображение',
      width: null,
      height: null
    }];
  }

  const normalizedImages = images.map((image, index) => ({
    src: image.url,
    width: Number.isInteger(image.width) && image.width > 0 ? image.width : null,
    height: Number.isInteger(image.height) && image.height > 0 ? image.height : null,
    alt: image.alt || image.title || `Изображение ${index + 1}`,
    title: image.title || image.alt || `Изображение ${index + 1}`
  }));

  let currentIndex = 0;
  let lightbox = null;
  let dimensionsPreloaded = false;

  const updateStatus = () => {
    if (!statusElement || normalizedImages.length <= 1) return;
    statusElement.textContent = `${currentIndex + 1} / ${normalizedImages.length}`;
  };

  const renderMainImage = (index) => {
    const image = normalizedImages[index];
    if (!image) return;

    currentIndex = index;
    mainImage.src = image.src;
    mainImage.alt = image.alt;

    if (image.width && image.height) {
      mainImage.width = image.width;
      mainImage.height = image.height;
    } else {
      mainImage.removeAttribute('width');
      mainImage.removeAttribute('height');
    }

    const thumbnailButtons = thumbnailsContainer.querySelectorAll('[data-gallery-thumb]');
    thumbnailButtons.forEach((button, thumbIndex) => {
      button.classList.toggle('is-active', thumbIndex === index);
      button.setAttribute('aria-current', thumbIndex === index ? 'true' : 'false');
    });

    updateStatus();
  };

  const renderThumbnails = () => {
    thumbnailsContainer.innerHTML = '';

    normalizedImages.forEach((image, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'caravan-gallery__thumb';
      button.setAttribute('data-gallery-thumb', '1');
      button.setAttribute('aria-label', `Показать изображение ${index + 1}`);
      button.innerHTML = `<img src="${image.src}" alt="${image.alt}">`;
      if (index === currentIndex) {
        button.classList.add('is-active');
        button.setAttribute('aria-current', 'true');
      }
      button.addEventListener('click', () => renderMainImage(index));
      thumbnailsContainer.appendChild(button);
    });
  };

  const goToImage = (direction) => {
    const nextIndex = (currentIndex + direction + normalizedImages.length) % normalizedImages.length;
    renderMainImage(nextIndex);
  };

  const ensureDimensions = (item) => new Promise((resolve) => {
    if (item.width && item.height) {
      resolve(item);
      return;
    }

    const probe = new Image();
    probe.onload = () => {
      item.width = probe.naturalWidth || item.width || 1600;
      item.height = probe.naturalHeight || item.height || 900;
      resolve(item);
    };
    probe.onerror = () => {
      item.width = item.width || 1600;
      item.height = item.height || 900;
      resolve(item);
    };
    probe.src = item.src;
  });

  const preloadDimensions = async () => {
    if (dimensionsPreloaded) return;
    await Promise.all(normalizedImages.map((item) => ensureDimensions(item)));
    dimensionsPreloaded = true;
    renderMainImage(currentIndex);
  };

  const getLightbox = () => {
    if (lightbox) {
      return lightbox;
    }

    lightbox = new PhotoSwipeLightbox({
      dataSource: normalizedImages,
      pswpModule: () => import('/public/vendor/photoswipe/photoswipe.esm.min.js'),
      bgOpacity: 0.92,
      showHideAnimationType: 'zoom',
      wheelToZoom: true,
      pinchToClose: true,
      closeOnVerticalDrag: true,
      preload: [1, 2]
    });

    lightbox.on('change', () => {
      const pswp = lightbox.pswp;
      if (!pswp) return;
      renderMainImage(pswp.currIndex);
    });

    lightbox.init();
    return lightbox;
  };

  const openLightbox = async (index) => {
    openButton.disabled = true;
    try {
      await preloadDimensions();
      getLightbox().loadAndOpen(index);
    } finally {
      openButton.disabled = false;
    }
  };

  renderThumbnails();
  renderMainImage(0);

  if (normalizedImages.length <= 1) {
    prevButton?.setAttribute('hidden', 'hidden');
    nextButton?.setAttribute('hidden', 'hidden');
    if (statusElement) {
      statusElement.hidden = true;
    }
  }

  prevButton?.addEventListener('click', () => goToImage(-1));
  nextButton?.addEventListener('click', () => goToImage(1));
  openButton.addEventListener('click', () => openLightbox(currentIndex));
  mainImage.addEventListener('click', () => openLightbox(currentIndex));

  let touchStartX = 0;
  let touchStartY = 0;

  const handleSwipeStart = (event) => {
    if (!event.touches || event.touches.length !== 1) return;
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
  };

  const handleSwipeEnd = (event) => {
    if (!event.changedTouches || event.changedTouches.length !== 1) return;
    const deltaX = event.changedTouches[0].clientX - touchStartX;
    const deltaY = event.changedTouches[0].clientY - touchStartY;
    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
      goToImage(deltaX < 0 ? 1 : -1);
    }
  };

  mainImage.addEventListener('touchstart', handleSwipeStart, { passive: true });
  mainImage.addEventListener('touchend', handleSwipeEnd, { passive: true });
}

document.addEventListener('DOMContentLoaded', initializeCaravanGallery);
