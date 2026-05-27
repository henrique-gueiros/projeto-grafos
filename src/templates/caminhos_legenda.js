(function () {
  var config = window.CAMINHOS_OBRIGATORIOS;
  if (!config || typeof edges === "undefined" || typeof nodes === "undefined") return;

  var active = { path1: false, path2: false, regions: {} };

  function edgeKey(from, to) {
    return from < to ? from + "|" + to : to + "|" + from;
  }

  function buildPathSets() {
    var sets = { path1: {}, path2: {} };
    ["path1", "path2"].forEach(function (pathId) {
      (config[pathId].edges || []).forEach(function (pair) {
        sets[pathId][edgeKey(pair[0], pair[1])] = true;
      });
    });
    return sets;
  }

  function buildRegionSets() {
    var sets = {};
    var regionData = config.regions || {};
    Object.keys(regionData).forEach(function (regiao) {
      sets[regiao] = {};
      (regionData[regiao] || []).forEach(function (pair) {
        sets[regiao][edgeKey(pair[0], pair[1])] = true;
      });
      active.regions[regiao] = false;
    });
    return sets;
  }

  var pathSets = buildPathSets();
  var regionSets = buildRegionSets();
  var regionColors = config.regionColors || {};

  function hasActivePaths() {
    return active.path1 || active.path2;
  }

  function hasActiveRegions() {
    return Object.keys(active.regions).some(function (r) {
      return active.regions[r];
    });
  }

  function hasActiveHighlights() {
    return hasActivePaths() || hasActiveRegions();
  }

  function isolatedNodeIds() {
    if (!hasActivePaths()) return null;

    var ids = {};
    ["path1", "path2"].forEach(function (pathId) {
      if (!active[pathId]) return;
      (config[pathId].nodes || []).forEach(function (id) {
        ids[id] = true;
      });
    });
    return ids;
  }

  function applyNodeVisibility() {
    var allowed = isolatedNodeIds();
    if (allowed) {
      if (typeof window.showOnlyNodes === "function") {
        window.showOnlyNodes(Object.keys(allowed));
      }
    } else if (typeof window.clearNodeWhitelist === "function") {
      window.clearNodeWhitelist();
    }
  }

  function defaultEdgeStyle() {
    return {
      color: { color: config.defaultEdge.color, highlight: "#ffffff", opacity: 1 },
      width: config.defaultEdge.width,
    };
  }

  function resetEdgeStyles() {
    var updates = [];
    edges.get().forEach(function (edge) {
      updates.push({ id: edge.id, hidden: edge.hidden, color: defaultEdgeStyle().color, width: defaultEdgeStyle().width });
    });
    if (updates.length) edges.update(updates);
  }

  function applyEdgeStyles() {
    if (!hasActiveHighlights()) {
      resetEdgeStyles();
      return;
    }

    var updates = [];
    var hasPath = hasActivePaths();
    var hasRegion = hasActiveRegions();

    edges.get().forEach(function (edge) {
      if (edge.hidden) return;

      var key = edgeKey(edge.from, edge.to);
      var in1 = !!pathSets.path1[key] && active.path1;
      var in2 = !!pathSets.path2[key] && active.path2;
      var style = defaultEdgeStyle();

      if (in1 && in2) {
        style.color = { color: "#ffaa00", highlight: "#ffffff", opacity: 1 };
        style.width = config.highlightWidth + 1;
      } else if (in1) {
        style.color = { color: config.path1.color, highlight: "#ffffff", opacity: 1 };
        style.width = config.highlightWidth;
      } else if (in2) {
        style.color = { color: config.path2.color, highlight: "#ffffff", opacity: 1 };
        style.width = config.highlightWidth;
      } else if (hasRegion) {
        var matched = false;
        Object.keys(active.regions).forEach(function (regiao) {
          if (!active.regions[regiao]) return;
          if (regionSets[regiao] && regionSets[regiao][key]) {
            style.color = { color: regionColors[regiao] || config.defaultEdge.color, highlight: "#ffffff", opacity: 1 };
            style.width = 3;
            matched = true;
          }
        });
        if (!matched) {
          style.color = { color: config.defaultEdge.color, highlight: "#ffffff", opacity: 0.12 };
        }
      } else if (hasPath) {
        style.color = { color: config.defaultEdge.color, highlight: "#ffffff", opacity: 0.12 };
      }

      updates.push({ id: edge.id, color: style.color, width: style.width });
    });

    if (updates.length) edges.update(updates);
  }

  function applyAll() {
    applyNodeVisibility();
    applyEdgeStyles();
    if (typeof network !== "undefined") {
      window.setTimeout(function () {
        network.fit({ animation: { duration: 350, easingFunction: "easeInOutQuad" } });
      }, 60);
    }
  }

  function setRegionHighlight(regiao, on) {
    active.regions[regiao] = on;
  }

  function clearRegionHighlights() {
    Object.keys(active.regions).forEach(function (regiao) {
      active.regions[regiao] = false;
    });
    document.querySelectorAll(".region-toggle[data-regiao]").forEach(function (btn) {
      btn.classList.remove("active");
      btn.setAttribute("aria-pressed", "false");
    });
  }

  function clearPathHighlights() {
    active.path1 = false;
    active.path2 = false;
    document.querySelectorAll("[data-caminho]").forEach(function (btn) {
      btn.classList.remove("active");
      btn.setAttribute("aria-pressed", "false");
    });
  }

  function clearHighlights() {
    clearPathHighlights();
    clearRegionHighlights();
    if (typeof window.clearNodeWhitelist === "function") {
      window.clearNodeWhitelist();
    }
    applyEdgeStyles();
  }

  window.clearGraphHighlights = clearHighlights;
  window.reapplyGraphHighlights = applyEdgeStyles;
  window.hasActiveGraphHighlights = hasActiveHighlights;

  function setupPathToggles() {
    document.querySelectorAll("[data-caminho]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var pathId = btn.getAttribute("data-caminho");
        active[pathId] = !active[pathId];
        btn.classList.toggle("active", active[pathId]);
        btn.setAttribute("aria-pressed", active[pathId] ? "true" : "false");
        applyAll();
      });
    });
  }

  function setupRegionToggles() {
    document.querySelectorAll(".region-toggle[data-regiao]").forEach(function (btn) {
      var regiao = btn.getAttribute("data-regiao");
      btn.addEventListener("click", function () {
        var next = !active.regions[regiao];
        setRegionHighlight(regiao, next);
        btn.classList.toggle("active", next);
        btn.setAttribute("aria-pressed", next ? "true" : "false");
        applyEdgeStyles();
      });
    });
  }

  function setupClearButton() {
    var btn = document.getElementById("btn-clear-highlights");
    if (btn) btn.addEventListener("click", clearHighlights);

    var btnAll = document.getElementById("btn-clear-all");
    if (btnAll) {
      btnAll.addEventListener("click", function () {
        if (typeof window.clearGraphAll === "function") window.clearGraphAll();
      });
    }
  }

  function boot() {
    setupPathToggles();
    setupRegionToggles();
    setupClearButton();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
