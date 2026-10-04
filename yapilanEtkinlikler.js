const posterDialog = document.querySelector('#poster-dialog');
const posterTitle = document.querySelector('#poster-title');
const posterMessage = document.querySelector('#poster-message');
const posterImage = document.querySelector('#poster-image');
const posterCloseButton = document.querySelector('.poster-dialog__close');
const posterPreviousButton = document.querySelector('#poster-previous');
const posterNextButton = document.querySelector('#poster-next');
const posterCounter = document.querySelector('#poster-counter');

let galleryImages = [];
let currentImageIndex = 0;

function showGalleryImage() {
    if (!posterImage || !posterTitle || !posterMessage || !posterPreviousButton || !posterNextButton || !posterCounter) {
        return;
    }

    const imagePath = galleryImages[currentImageIndex];

    posterImage.classList.remove('is-visible');
    posterImage.alt = `${posterTitle.textContent} - görsel`;
    posterMessage.textContent = 'Görsel yükleniyor...';
    posterCounter.textContent = `${currentImageIndex + 1} / ${galleryImages.length}`;
    posterPreviousButton.hidden = galleryImages.length < 2;
    posterNextButton.hidden = galleryImages.length < 2;
    posterPreviousButton.disabled = currentImageIndex === 0;
    posterNextButton.disabled = currentImageIndex === galleryImages.length - 1;
    posterImage.src = imagePath ? encodeURI(imagePath) : '';
}

function openGallery(eventButton) {
    if (!posterDialog || !posterTitle || !posterMessage) {
        return;
    }

    const title = eventButton.dataset.title || 'Etkinlik';
    posterTitle.textContent = title;

    try {
        const galleryValue = eventButton.dataset.gallery || '[]';
        galleryImages = JSON.parse(galleryValue);
    } catch (error) {
        console.error('Etkinlik görsel listesi okunamadı.', error);
        posterMessage.textContent = 'Etkinlik görselleri yüklenemedi.';
        posterDialog.showModal();
        return;
    }

    if (!Array.isArray(galleryImages) || galleryImages.length === 0) {
        posterMessage.textContent = 'Bu etkinlik için henüz görsel eklenmedi.';
        posterDialog.showModal();
        return;
    }

    currentImageIndex = 0;
    showGalleryImage();
    posterDialog.showModal();
}

document.querySelectorAll('.past-event').forEach((eventButton) => {
    eventButton.addEventListener('click', () => openGallery(eventButton));
});

if (posterImage) {
    posterImage.addEventListener('load', () => {
        if (!posterMessage) {
            return;
        }

        posterMessage.textContent = '';
        posterImage.classList.add('is-visible');
    });

    posterImage.addEventListener('error', () => {
        posterImage.classList.remove('is-visible');
        posterMessage.textContent = 'Bu görsel henüz eklenmedi.';
    });
}

if (posterPreviousButton) {
    posterPreviousButton.addEventListener('click', () => {
        if (currentImageIndex > 0) {
            currentImageIndex -= 1;
            showGalleryImage();
        }
    });
}

if (posterNextButton) {
    posterNextButton.addEventListener('click', () => {
        if (currentImageIndex < galleryImages.length - 1) {
            currentImageIndex += 1;
            showGalleryImage();
        }
    });
}

if (posterCloseButton) {
    posterCloseButton.addEventListener('click', () => posterDialog.close());
}

if (posterDialog) {
    posterDialog.addEventListener('click', (event) => {
        if (event.target === posterDialog) {
            posterDialog.close();
        }
    });
}
