const btn = document.querySelector('.move-button');
const img = document.querySelector('.image');

function rotateEl() {
  img.classList.toggle('move');
}

btn.addEventListener('click', rotateEl);
