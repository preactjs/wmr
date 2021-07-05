const result = typeof process === 'object' && 'development' === 'production';
document.getElementById('out').textContent = result;
