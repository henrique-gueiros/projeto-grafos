(function () {
  var config = window.CAMINHOS_OBRIGATORIOS;
  if (!config || typeof edges === "undefined") return;

  var active = { path1: false, path2: false };

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

  var pathSets = buildPathSets();

  function applyPathColors() {
    var updates = [];
    var all = edges.get({ returnType: "Object" });

    for (var id in all) {
      var e = all[id];
      var key = edgeKey(e.from, e.to);
      var in1 = !!pathSets.path1[key] && active.path1;
      var in2 = !!pathSets.path2[key] && active.path2;
      var color, width;

      if (in1 && in2) {
        color = "#ffaa00";
        width = 5;
      } else if (in1) {
        color = config.path1.color;
        width = config.highlightWidth;
      } else if (in2) {
        color = config.path2.color;
        width = config.highlightWidth;
      } else {
        color = config.defaultEdge.color;
        width = config.defaultEdge.width;
      }

      updates.push({
        id: id,
        color: { color: color, highlight: "#ffffff" },
        width: width,
      });
    }

    edges.update(updates);
  }

  function setupPathToggles() {
    document.querySelectorAll("[data-caminho]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var pathId = btn.getAttribute("data-caminho");
        active[pathId] = !active[pathId];
        btn.classList.toggle("active", active[pathId]);
        btn.setAttribute("aria-pressed", active[pathId] ? "true" : "false");
        applyPathColors();
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupPathToggles);
  } else {
    setupPathToggles();
  }
})();
