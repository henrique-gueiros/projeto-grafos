(function () {
  function traduzirTomSelect(select, placeholder) {
    if (!select) return;
    var ts = select.tomselect;
    if (ts) {
      ts.settings.placeholder = placeholder;
      ts.control_input.setAttribute("placeholder", placeholder);
      if (!ts.getValue()) ts.inputState();
    } else {
      var opt = select.querySelector('option[value=""]');
      if (opt) opt.textContent = placeholder;
    }
  }

  function setupFiltroLateral() {
    var filterMenu = document.getElementById("filter-menu");
    if (!filterMenu) return;

    // Traduz labels das colunas
    var labels = ["Elemento", "Propriedade", "Valor"];
    var cols = filterMenu.querySelectorAll(".row > [class*='col-']");
    cols.forEach(function (col, i) {
      if (i < labels.length) {
        var lbl = document.createElement("label");
        lbl.textContent = labels[i];
        col.insertBefore(lbl, col.firstChild);
      }
    });

    // Traduz placeholders via API do Tom Select
    var selects = filterMenu.querySelectorAll("select");
    traduzirTomSelect(selects[0], "Nó ou aresta\u2026");
    traduzirTomSelect(selects[1], "Propriedade\u2026");
    traduzirTomSelect(selects[2], "Valor(es)\u2026");

    // Traduz botões
    var btns = filterMenu.querySelectorAll(".btn");
    var btnLabels = ["Filtrar", "Limpar"];
    btns.forEach(function (btn, i) {
      if (btnLabels[i]) btn.textContent = btnLabels[i];
    });

    // Monta a sidebar
    var sidebar = document.createElement("div");
    sidebar.id = "filtro-sidebar";

    var header = document.createElement("div");
    header.id = "filtro-sidebar-header";
    header.innerHTML = "<h2>Filtros</h2><p>Refine n\u00f3s e arestas exibidos no grafo</p>";
    sidebar.appendChild(header);

    var oldHeader = filterMenu.parentNode;
    oldHeader.removeChild(filterMenu);
    if (oldHeader.classList && oldHeader.classList.contains("card-header")) {
      oldHeader.remove();
    }

    sidebar.appendChild(filterMenu);
    document.body.insertBefore(sidebar, document.body.firstChild);

    // Toggle da sidebar
    var btn = document.getElementById("btn-filtro-toggle");
    btn.addEventListener("click", function () {
      sidebar.classList.toggle("open");
      btn.setAttribute(
        "aria-label",
        sidebar.classList.contains("open") ? "Fechar painel de filtros" : "Abrir painel de filtros"
      );
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupFiltroLateral);
  } else {
    setupFiltroLateral();
  }
})();
