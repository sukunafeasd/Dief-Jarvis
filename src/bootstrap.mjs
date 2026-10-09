try {
  await import("./main.jsx");
} catch (error) {
  window.dispatchEvent(new Event("jarvis:boot-failed"));
  console.error("Falha ao carregar a interface do Jarvis", error);
}
