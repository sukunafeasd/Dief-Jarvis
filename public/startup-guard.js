(() => {
  const reload = document.getElementById("boot-reload");
  reload?.addEventListener("click", () => location.reload());
  const show = (message) => {
    const status = document.getElementById("boot-status");
    if (!status) return;
    status.textContent = message;
    if (reload) reload.hidden = false;
  };
  const timer = setTimeout(
    () => show("A inicializacao esta demorando mais que o esperado."),
    12000,
  );
  window.addEventListener(
    "jarvis:boot-failed",
    () => {
      clearTimeout(timer);
      show("Nao foi possivel iniciar o Jarvis. Seus dados foram preservados.");
    },
    { once: true },
  );
})();
