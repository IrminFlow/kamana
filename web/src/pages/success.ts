if (new URLSearchParams(location.search).get("replaced") === "1") {
  document.querySelector<HTMLElement>("[data-replaced]")!.hidden = false;
}
