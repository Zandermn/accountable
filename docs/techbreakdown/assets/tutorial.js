document.querySelectorAll('pre').forEach((block) => {
  const wrapper = block.closest('.code-block');
  if (!wrapper || !navigator.clipboard) return;

  const button = document.createElement('button');
  button.className = 'copy-button';
  button.type = 'button';
  button.textContent = 'Copy';
  button.setAttribute('aria-label', 'Copy code');
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(block.textContent);
      button.textContent = 'Copied';
      setTimeout(() => { button.textContent = 'Copy'; }, 1600);
    } catch {
      button.textContent = 'Select and copy';
    }
  });
  wrapper.append(button);
});
