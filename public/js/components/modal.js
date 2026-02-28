// Modal Component
const Modal = {
    show(title, bodyHTML, footerHTML = '') {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-body').innerHTML = bodyHTML;
        document.getElementById('modal-footer').innerHTML = footerHTML;
        document.getElementById('modal-overlay').style.display = 'flex';
    },

    hide() {
        document.getElementById('modal-overlay').style.display = 'none';
    },

    confirm(title, message, onConfirm) {
        this.show(title, `<p>${message}</p>`, `
            <button class="btn btn-secondary" onclick="Modal.hide()">İptal</button>
            <button class="btn btn-danger" id="modal-confirm-btn">Evet, Devam Et</button>
        `);
        document.getElementById('modal-confirm-btn').addEventListener('click', () => {
            this.hide();
            onConfirm();
        });
    }
};

// Modal close events
document.getElementById('modal-close').addEventListener('click', () => Modal.hide());
document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) Modal.hide();
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') Modal.hide();
});
