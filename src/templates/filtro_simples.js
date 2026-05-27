(function () {
  if (typeof nodes === "undefined" || typeof edges === "undefined") return;

  var config = window.GRAFO_FILTROS || {};
  var totalNodes = config.totalNodes || nodes.length;
  var totalEdges = config.totalEdges || edges.length;
  var selectedRegioes = {};
  var selectedTipos = {};
  var nodeWhitelist = null;

  function activeKeys(obj) {
    return Object.keys(obj).filter(function (k) { return obj[k]; });
  }

  function reapplyHighlights() {
    if (typeof window.reapplyGraphHighlights === "function") {
      window.reapplyGraphHighlights();
    }
  }

  window.showOnlyNodes = function (ids) {
    nodeWhitelist = {};
    (ids || []).forEach(function (id) { nodeWhitelist[id] = true; });
    applyFilters();
  };

  window.clearNodeWhitelist = function () {
    nodeWhitelist = null;
    applyFilters();
  };

  window.clearGraphFilters = function () {
    Object.keys(selectedRegioes).forEach(function (r) { selectedRegioes[r] = false; });
    Object.keys(selectedTipos).forEach(function (t) { selectedTipos[t] = false; });
    document.querySelectorAll("#filtro-simples .filtro-chip").forEach(function (chip) {
      chip.classList.remove("active");
      chip.setAttribute("aria-pressed", "false");
    });
    nodeWhitelist = null;
    applyFilters();
  };

  window.clearGraphAll = function () {
    window.clearGraphFilters();
    if (typeof window.clearGraphHighlights === "function") {
      window.clearGraphHighlights();
    }
  };

  function updateStats(visibleNodes, visibleEdges) {
    var el = document.getElementById("filter-stats");
    if (!el) return;
    el.textContent =
      "Mostrando " + visibleNodes + " de " + totalNodes +
      " aeroportos · " + visibleEdges + " de " + totalEdges + " ligações";
  }

  function applyFilters() {
    var regioesAtivas = activeKeys(selectedRegioes);
    var tiposAtivos = activeKeys(selectedTipos);
    var nodeUpdates = [];
    var edgeUpdates = [];
    var hiddenNodes = {};
    var visibleNodeCount = 0;
    var visibleEdgeCount = 0;

    nodes.get().forEach(function (node) {
      var regiao = node.group || "";
      var hide = false;

      if (nodeWhitelist && !nodeWhitelist[node.id]) hide = true;
      if (!hide && regioesAtivas.length && regioesAtivas.indexOf(regiao) === -1) hide = true;

      nodeUpdates.push({ id: node.id, hidden: hide });
      if (hide) hiddenNodes[node.id] = true;
      else visibleNodeCount++;
    });

    edges.get().forEach(function (edge) {
      var hide = !!hiddenNodes[edge.from] || !!hiddenNodes[edge.to];
      var tipo = edge.tipo || "regional";
      if (!hide && tiposAtivos.length && tiposAtivos.indexOf(tipo) === -1) hide = true;
      edgeUpdates.push({ id: edge.id, hidden: hide });
      if (!hide) visibleEdgeCount++;
    });

    if (nodeUpdates.length) nodes.update(nodeUpdates);
    if (edgeUpdates.length) edges.update(edgeUpdates);

    updateStats(visibleNodeCount, visibleEdgeCount);

    if (typeof window.hasActiveGraphHighlights === "function" &&
        window.hasActiveGraphHighlights()) {
      reapplyHighlights();
    }

    document.dispatchEvent(new CustomEvent("grafo-filtro-change"));
  }

  window.applyGraphFilters = applyFilters;

  function initChips() {
    document.querySelectorAll("#filtro-regioes .filtro-chip").forEach(function (chip) {
      var regiao = chip.getAttribute("data-regiao");
      selectedRegioes[regiao] = false;
      chip.addEventListener("click", function () {
        selectedRegioes[regiao] = !selectedRegioes[regiao];
        chip.classList.toggle("active", selectedRegioes[regiao]);
        chip.setAttribute("aria-pressed", selectedRegioes[regiao] ? "true" : "false");
        applyFilters();
      });
    });

    document.querySelectorAll("#filtro-tipos .filtro-chip").forEach(function (chip) {
      var tipo = chip.getAttribute("data-tipo");
      selectedTipos[tipo] = false;
      chip.addEventListener("click", function () {
        selectedTipos[tipo] = !selectedTipos[tipo];
        chip.classList.toggle("active", selectedTipos[tipo]);
        chip.setAttribute("aria-pressed", selectedTipos[tipo] ? "true" : "false");
        applyFilters();
      });
    });

    var clearBtn = document.getElementById("btn-limpar-filtros");
    if (clearBtn) clearBtn.addEventListener("click", window.clearGraphFilters);
  }

  function boot() {
    initChips();
    applyFilters();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
