(function () {
  if (typeof network === "undefined" || typeof nodes === "undefined") return;

  function migrateTitles(dataset) {
    var updates = [];
    dataset.get().forEach(function (item) {
      if (item.title) {
        updates.push({ id: item.id, tooltipHtml: item.title, title: undefined });
      }
    });
    if (updates.length) dataset.update(updates);
  }

  migrateTitles(nodes);

  var tip = document.createElement("div");
  tip.id = "grafo-tooltip";
  tip.setAttribute("role", "tooltip");
  document.body.appendChild(tip);

  var container = document.getElementById("mynetwork");
  var activeHtml = null;

  function pointerFrom(paramsOrEvent) {
    var e = paramsOrEvent && (paramsOrEvent.event || paramsOrEvent.srcEvent || paramsOrEvent);
    if (e && e.clientX != null) {
      return { x: e.clientX + 14, y: e.clientY + 14 };
    }
    if (paramsOrEvent && paramsOrEvent.pointer && paramsOrEvent.pointer.DOM && container) {
      var rect = container.getBoundingClientRect();
      return {
        x: rect.left + paramsOrEvent.pointer.DOM.x + 14,
        y: rect.top + paramsOrEvent.pointer.DOM.y + 14,
      };
    }
    return null;
  }

  function showTooltip(html, paramsOrEvent) {
    if (!html) return;
    activeHtml = html;
    tip.innerHTML = html;
    tip.style.display = "block";
    var pos = pointerFrom(paramsOrEvent);
    if (pos) {
      tip.style.left = pos.x + "px";
      tip.style.top = pos.y + "px";
    }
  }

  function moveTooltip(paramsOrEvent) {
    if (!activeHtml) return;
    var pos = pointerFrom(paramsOrEvent);
    if (pos) {
      tip.style.left = pos.x + "px";
      tip.style.top = pos.y + "px";
    }
  }

  function hideTooltip() {
    activeHtml = null;
    tip.style.display = "none";
    tip.innerHTML = "";
  }

  network.on("hoverNode", function (params) {
    var node = nodes.get(params.node);
    showTooltip(node && node.tooltipHtml, params);
  });

  network.on("blurNode", hideTooltip);

  network.on("hoverEdge", function (params) {
    var edge = edges.get(params.edge);
    showTooltip(edge && edge.tooltipHtml, params);
  });

  network.on("blurEdge", hideTooltip);

  network.on("dragStart", hideTooltip);
  network.on("zoom", hideTooltip);

  if (container) {
    container.addEventListener("mousemove", moveTooltip);
  }
})();
