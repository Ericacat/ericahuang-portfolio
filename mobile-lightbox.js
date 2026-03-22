(function () {
    // Create lightbox
    const lightbox = document.createElement('div');
    lightbox.id = 'mobile-lightbox';
    lightbox.className = 'lightbox';
    lightbox.innerHTML = '<span class="lightbox-close">&times;</span><img class="lightbox-content" id="mobile-lightbox-img" alt="">';
    document.body.appendChild(lightbox);

    function closeLightbox() {
        lightbox.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    lightbox.addEventListener('click', function (e) {
        if (e.target === this) closeLightbox();
    });
    lightbox.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeLightbox();
    });

    document.addEventListener('DOMContentLoaded', function () {
        const images = document.querySelectorAll('.full-width-image img, .section-image img');
        images.forEach(function (img) {
            img.classList.add('mobile-zoomable');
            img.addEventListener('click', function () {
                if (window.innerWidth > 1024) return;
                document.getElementById('mobile-lightbox-img').src = this.src;
                lightbox.style.display = 'flex';
                document.body.style.overflow = 'hidden';
            });
        });
    });
})();
