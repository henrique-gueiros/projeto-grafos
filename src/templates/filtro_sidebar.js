(function () {
  function setupFiltroLateral() {
    var sidebar = document.createElement("div");
    sidebar.id = "filtro-sidebar";

    var header = document.createElement("div");
    header.id = "filtro-sidebar-header";
    header.innerHTML =
      "<h2>Filtros</h2>" +
      "<p>Clique nos botões para filtrar. Clique de novo para desfazer.</p>";
    sidebar.appendChild(header);

    var filtro = document.getElementById("filtro-simples");
    if (filtro) sidebar.appendChild(filtro);

    var charts = document.getElementById("graficos-dinamicos");
    if (charts) sidebar.appendChild(charts);

    document.body.insertBefore(sidebar, document.body.firstChild);

    var btn = document.getElementById("btn-filtro-toggle");
    if (!btn) return;

    btn.addEventListener("click", function () {
      sidebar.classList.toggle("open");
      btn.setAttribute(
        "aria-label",
        sidebar.classList.contains("open")
          ? "Fechar painel de filtros"
          : "Abrir painel de filtros"
      );
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupFiltroLateral);
  } else {
    setupFiltroLateral();
  }
})();
