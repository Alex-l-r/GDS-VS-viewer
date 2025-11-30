
ws_url = ws_url.replace("http://","ws://").replace("https://", "wss://");

let url = ws_url + '/ws?' + params.toString();

let canvas = document.getElementById("layout_canvas");
let context = canvas.getContext("2d");

let message = document.getElementById("message");

// Connection state management
let connectionState = 'connecting'; // 'connecting', 'connected', 'disconnected', 'error'
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 3;

// Create and show loading overlay
function createLoadingOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'loading-overlay';
  overlay.className = 'position-absolute top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center';
  overlay.style.cssText = 'background: rgba(0,0,0,0.7); z-index: 1000;';
  overlay.innerHTML = `
    <div class="text-center text-light">
      <div class="spinner-border text-primary mb-3" role="status" style="width: 3rem; height: 3rem;">
        <span class="visually-hidden">Loading...</span>
      </div>
      <div id="loading-status">Connecting to server...</div>
    </div>
  `;
  document.getElementById('layout-view').appendChild(overlay);
  return overlay;
}

// Update loading status text
function updateLoadingStatus(text) {
  const status = document.getElementById('loading-status');
  if (status) {
    status.textContent = text;
  }
}

// Hide loading overlay
function hideLoadingOverlay() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.3s';
    setTimeout(() => overlay.remove(), 300);
  }
}

// Show connection status indicator
function showConnectionStatus(state, message) {
  let statusBar = document.getElementById('connection-status');
  if (!statusBar) {
    statusBar = document.createElement('div');
    statusBar.id = 'connection-status';
    statusBar.className = 'position-absolute bottom-0 start-0 m-2 px-2 py-1 rounded small';
    statusBar.style.zIndex = '100';
    document.getElementById('layout-view').appendChild(statusBar);
  }
  
  const colors = {
    'connecting': 'bg-warning text-dark',
    'connected': 'bg-success text-white',
    'disconnected': 'bg-danger text-white',
    'error': 'bg-danger text-white'
  };
  
  statusBar.className = `position-absolute bottom-0 start-0 m-2 px-2 py-1 rounded small ${colors[state] || 'bg-secondary'}`;
  statusBar.textContent = message || state;
  
  // Auto-hide success status after 3 seconds
  if (state === 'connected') {
    setTimeout(() => {
      if (statusBar.textContent.includes('Connected')) {
        statusBar.style.opacity = '0';
        statusBar.style.transition = 'opacity 0.5s';
      }
    }, 3000);
  }
}

// Initialize loading overlay
const loadingOverlay = createLoadingOverlay();

let socket = new WebSocket(url);
socket.binaryType = "blob";
let initialized = false;

const categoryList = document.getElementById("rdbCategoryOptions");
const cellList = document.getElementById("rdbCellOptions");
cellList.selectedIndex = -1;
categoryList.selectedIndex = -1;

const rdbCategory = document.getElementById("rdbCategory");
const rdbCell = document.getElementById("rdbCell");

const rdbItems = document.getElementById("rdbItems");

async function initializeWebSocket() {
  await new Promise((resolve) => {
    //  Installs a handler called when the connection is established
    socket.onopen = function(evt) {
      connectionState = 'connected';
      updateLoadingStatus('Loading layout...');
      showConnectionStatus('connected', 'Connected');
      let ev = { msg: "initialize", width: canvas.width, height: canvas.height };
      socket.send(JSON.stringify(ev));
      resolve(); // Resolve the promise when the WebSocket is ready
    };
  });

  // Call resizeCanvas the first time
  resizeCanvas();
}

// Valid message types from the server
const VALID_MESSAGE_TYPES = new Set([
  "initialized", "loaded", "reloaded", "layer-u", "metainfo", 
  "rdbinfo", "error", "rdb-items", "hierarchy"
]);

/**
 * Safely parse and validate WebSocket message
 * @param {string} data - Raw message data
 * @returns {object|null} Parsed message or null if invalid
 */
function parseWebSocketMessage(data) {
  try {
    const parsed = JSON.parse(data);
    if (typeof parsed !== 'object' || parsed === null) {
      console.warn('WebSocket message is not an object');
      return null;
    }
    if (typeof parsed.msg !== 'string') {
      console.warn('WebSocket message missing "msg" field');
      return null;
    }
    return parsed;
  } catch (e) {
    console.error('Failed to parse WebSocket message:', e);
    return null;
  }
}

//  Installs a handler for the messages delivered by the web socket
socket.onmessage = async function(evt) {

  let data = evt.data;
  if (typeof(data) === "string") {

    const js = parseWebSocketMessage(data);
    if (!js) return;

    if (js.msg === "initialized") {
      initialized = true;
      hideLoadingOverlay();
    } else if (js.msg === "loaded") {
      showLayers(js.layers);
      showMenu(js.modes, js.annotations);
      showCells(js.hierarchy, js.ci);
      hideLoadingOverlay();
    } else if (js.msg === "reloaded") {
      showLayers(js.layers);
      showCells(js.hierarchy, js.ci);
    } else if (js.msg === "layer-u") {
      updateLayerImages(js.layers);
    } else if (js.msg === "metainfo") {
      updateMetaInfo(js.metainfo);
    } else if (js.msg === "rdbinfo") {
      updateRdbTab(js.rdbinfo);      
    } else if (js.msg === "error") {
      console.error('Server error:', js.details);
      showErrorNotification(js.details);
    } else if (js.msg === "rdb-items") {
      await updateRdbItems(js.items);
    } else {
      console.warn('Unknown message type:', js.msg);
    }
  } else if (initialized) {

    //  incoming blob messages are paint events
    createImageBitmap(data).then(function(image) {
      context.drawImage(image, 0, 0);
    });

  }

};

/**
 * Show error notification to user (non-blocking)
 */
function showErrorNotification(message) {
  // Create a toast-style notification instead of blocking alert
  const toast = document.createElement('div');
  toast.className = 'alert alert-danger position-fixed bottom-0 end-0 m-3';
  toast.style.zIndex = '9999';
  toast.style.maxWidth = '400px';
  toast.innerHTML = `
    <strong>Error:</strong> ${message}
    <button type="button" class="btn-close float-end" onclick="this.parentElement.remove()"></button>
  `;
  document.body.appendChild(toast);
  
  // Auto-remove after 10 seconds
  setTimeout(() => toast.remove(), 10000);
}

socket.onclose = function(evt) {
  connectionState = 'disconnected';
  console.log(`WebSocket closed: ${evt.code}`);
  showConnectionStatus('disconnected', `Disconnected (code: ${evt.code})`);
};

socket.onerror = function(evt) {
  connectionState = 'error';
  console.error('WebSocket error:', evt);
  showConnectionStatus('error', 'Connection error');
  hideLoadingOverlay();
};

function mouseEventToJSON(canvas, type, evt) {

  let rect = canvas.getBoundingClientRect();
  let x = evt.clientX - rect.left;
  let y = evt.clientY - rect.top;
  let keys = 0;
  if (evt.shiftKey) {
    keys += 1;
  }
  if (evt.ctrlKey) {
    keys += 2;
  }
  if (evt.altKey) {
    keys += 4;
  }
  return { msg: type, x: x, y: y, b: evt.buttons, k: keys };

}

function sendMouseEvent(canvas, type, evt) {

  if (socket.readyState == WebSocket.OPEN /*OPEN*/) {
    let ev = mouseEventToJSON(canvas, type, evt);
    socket.send(JSON.stringify(ev));
  }

}

function sendWheelEvent(canvas, type, evt) {

  if (socket.readyState == WebSocket.OPEN /*OPEN*/) {
    let ev = mouseEventToJSON(canvas, type, evt);
    ev.dx = evt.deltaX;
    ev.dy = evt.deltaY;
    ev.dm = evt.deltaMode;
    socket.send(JSON.stringify(ev));
  }

}

function sendKeyEvent(canvas, type, evt) {
  if (socket.readyState == WebSocket.OPEN) {
    socket.send(JSON.stringify({ msg: type, k: evt.keyCode }));
  }
}

let lastCanvasWidth = 0;
let lastCanvasHeight = 0;
let resizeObserver = null;

function resizeCanvas() {
  let view = document.getElementById('layout-view');
  let w = canvas.clientWidth;
  let h = canvas.clientHeight;

  if (view && view.parentElement) {
    view.height = view.parentElement.clientHeight;
  }

  if (lastCanvasWidth !== w || lastCanvasHeight !== h) {
    lastCanvasWidth = w;
    lastCanvasHeight = h;

    canvas.width = w;
    canvas.height = h;

    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ msg: "resize", width: w, height: h }));
    }
  }
}

// Use ResizeObserver for efficient resize detection (no polling)
function setupResizeObserver() {
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
  
  resizeObserver = new ResizeObserver((entries) => {
    if (initialized) {
      // Debounce resize events
      requestAnimationFrame(() => {
        resizeCanvas();
      });
    }
  });
  
  resizeObserver.observe(canvas);
  
  // Also observe the layout view container
  const layoutView = document.getElementById('layout-view');
  if (layoutView) {
    resizeObserver.observe(layoutView);
  }
}

initializeWebSocket();

// Setup ResizeObserver after DOM is ready
setupResizeObserver();

// Fallback for browsers without ResizeObserver (shouldn't happen in modern VS Code)
window.addEventListener("resize", function() {
  if (initialized) {
    resizeCanvas();
  }
});

//  Updates the Menu
function showMenu(modes, annotations) {

  let modeElement = document.getElementById("modes");
  modeElement.childNodes = new Array();

  let modeRow = document.createElement("div");
  modeRow.className = "btn-group flex-wrap";
  modeRow.setAttribute("role", "group");
  modeRow.role = "group";
  modeRow.aria_label = "Layout Mode Selection"
  modeRow.id = "mode-row";
  modeRow.childNodes = new Array();
  modeElement.appendChild(modeRow);

  modes.forEach(function(m, i) {


    let inner = document.createElement("input");
    inner.value = m;
    inner.type = "radio";
    inner.className = "btn-check";
    inner.id = "btnradio" + m;
    inner.setAttribute("name", "radiomode");
    if (i==0) {
      inner.setAttribute("checked", "");
    }
    inner.onclick = function() {
      socket.send(JSON.stringify({ msg: "select-mode", value: m }));
    };
    let innerlabel = document.createElement("label");
    innerlabel.textContent = m;
    innerlabel.className = "btn btn-outline-primary";
    innerlabel.setAttribute("for", "btnradio" + m);

    modeRow.appendChild(inner);
    modeRow.appendChild(innerlabel);

  });

  let menuElement = document.getElementById("menu");

  let clearRulers = document.createElement("button");
  clearRulers.id = "clearRulers";
  clearRulers.textContent = "Clear Rulers";
  clearRulers.className = "col-auto btn btn-primary mx-2";
  clearRulers.setAttribute("type", "button");
  clearRulers.onclick = function() {
    socket.send(JSON.stringify({ msg: "clear-annotations" }));
  };
  menuElement.appendChild(clearRulers);
  let zoomFit= document.createElement("button");
  zoomFit.id = "zoomFit";
  zoomFit.textContent = "Zoom Fit";
  zoomFit.className = "col-auto btn btn-primary mx-2";
  zoomFit.setAttribute("type", "button");
  zoomFit.onclick = function() {
    socket.send(JSON.stringify({ msg: "zoom-f" }));
  };
  menuElement.appendChild(zoomFit);
  let reload = document.createElement("button");
  reload.id = "reload";
  reload.textContent = "Reload";
  reload.className = "col-auto btn btn-primary mx-2";
  reload.setAttribute("type", "button");
  reload.onclick = function() {
    socket.send(JSON.stringify({ msg: "reload" }));
  };
  menuElement.appendChild(reload);
  

  let index = 0;

  annotations.forEach(function(a) {

    let option = document.createElement("option");
    option.value = index;
    option.text = a;

    rulersSelect.appendChild(option);

    index += 1;

  });
}

function selectCell(cell_index) {
  socket.send(JSON.stringify(
    {
      "msg": "ci-s",
      "ci": cell_index,
      "zoom-fit": true,
    }
  ))
}

function selectCellByName(cell_name) {
  let currentURL = new URL(window.location.href);
  currentURL.searchParams.set("cell", cell_name)
  window.history.replaceState({}, '', currentURL.toString())
  socket.send(JSON.stringify(
    {
      "msg": "cell-s",
      "cell": cell_name,
      "zoom-fit": true,
    }
  ))
}

//  Updates the layer list
function showCells(cells, current_index) {

  let layerElement = document.getElementById("cells-tab-pane");
  layerElement.replaceChildren();
  appendCells(layerElement, cells, current_index)

}

  //  create table rows for each layer
function appendCells(parentelement, cells, current_index, addpadding=false) {

  let lastelement = null;

  cells.forEach(function(c, i) {

    let cellRow = document.createElement("div");
    cellRow.className = "row mx-0";
    parentelement.appendChild(cellRow);
    if (c.children.length > 0) {

      let accordion = document.createElement("div");

      if (addpaddings){
        accordion.className = "accordion accordion-flush px-2";
      } else {
        accordion.className = "accordion accordion-flush ps-2 pe-0";
      }
      accordion.id = "cellgroup-" + c.id;


      cellRow.appendChild(accordion);

      accordion_item = document.createElement("div");
      accordion_item.className = "accordion-item";
      accordion.appendChild(accordion_item);

      accordion_header = document.createElement("div");
      accordion_header.className = "accordion-header d-flex flex-row";
      accordion_item.appendChild(accordion_header);

      accordion_header_button = document.createElement("button");
      accordion_header_button.className = "accordion-button p-0 w-auto border-bottom";
      accordion_header_button.setAttribute("type", "button");
      accordion_header_button.setAttribute("data-bs-toggle", "collapse");
      accordion_header_button.setAttribute("data-bs-target", "#collapseGroup" + c.id);
      accordion_header_button.setAttribute("aria-expanded", "true");
      accordion_header_button.setAttribute("aria-controls", "collapseGroup" + c.id);
      let cell_name_button = document.createElement("input");
      cell_name_button.className = "btn-check";
      cell_name_button.setAttribute("type", "radio");
      cell_name_button.setAttribute("name", "option-base");
      cell_name_button.id = "cell-" + c.id;
      cell_name_button.setAttribute("autocomplete", "off");
      if (c.id == current_index) {
        cell_name_button.setAttribute("checked", "")
      }
      cell_name_button.addEventListener("change", function(){
        selectCellByName(c.name);
      });
      let cell_name = document.createElement("label");
      cell_name.innerHTML = c.name;
      cell_name.className = "btn btn-dark w-100 text-start p-0";
      cell_name.setAttribute("for", "cell-" + c.id);
      accordion_row = document.createElement("div");
      accordion_row.className = "mx-0 border-bottom flex-grow-1";
      accordion_row.appendChild(cell_name_button);
      accordion_row.appendChild(cell_name);
      accordion_header.appendChild(accordion_row);

      accordion_header.appendChild(accordion_header_button);

      accordion_collapse = document.createElement("div")
      accordion_collapse.className = "accordion-collapse show";
      accordion_collapse.setAttribute("data-bs-parent", "#" + accordion.id);
      accordion_collapse.id = "collapseGroup" + c.id;
      accordion_item.appendChild(accordion_collapse);

      accordion_body = document.createElement("div");
      accordion_body.className = "accordion-body p-0";
      accordion_collapse.appendChild(accordion_body);

      appendCells(accordion_body, c.children, current_index, true);
      lastelement = accordion;

    } else {
      let cell_name_button = document.createElement("input");
      cell_name_button.className = "btn-check";
      cell_name_button.setAttribute("type", "radio");
      cell_name_button.setAttribute("name", "option-base");
      cell_name_button.id = "cell-" + c.id;
      cell_name_button.setAttribute("autocomplete", "off");
      cell_name_button.addEventListener("change", function(){
        selectCellByName(c.name);
      });
      if (c.id == current_index) {
        cell_name_button.setAttribute("checked", "")
      }
      let cell_name = document.createElement("label");
      cell_name.innerHTML = c.name;
      cell_name.className = "btn btn-dark text-start p-0";
      cell_name.setAttribute("for", "cell-" + c.id);
      accordion_row = document.createElement("div");
      accordion_row = document.createElement("row");
      accordion_row.className = "row mx-0";
      accordion_row.appendChild(cell_name_button);
      accordion_row.appendChild(cell_name);

      let accordion = document.createElement("div");
      if (addpaddings) {
        accordion.className = "accordion accordion-flush ps-2 pe-0";
      } else {
        accordion.className = "accordion accordion-flush px-0";
      }
      accordion.id = "cellgroup-" + c.id;
      cellRow.appendChild(accordion);

      accordion_item = document.createElement("div");
      accordion_item.className = "accordion-item";
      accordion.appendChild(accordion_item);

      accordion_header = document.createElement("div");
      accordion_header.className = "accordion-header";
      accordion_item.appendChild(accordion_header)
      accordion_header.appendChild(accordion_row);

      lastelement = accordion
    }

  });

  if (addpaddings && lastelement) {
     lastelement.classList.add("pb-2");
  }
}
//  Updates the layer list
function showLayers(layers) {

  let layerElement = document.getElementById("layers-tab-pane");
  let layerButtons = document.getElementById("layer-buttons");

  let layerSwitch = document.getElementById("layerEmptySwitch");

  let layerTable = document.getElementById("table-layer") || document.createElement("div");
  layerTable.id = "table-layer";
  layerTable.className = "container-fluid text-left px-0 pb-2";
  layerTable.replaceChildren();
  layerElement.replaceChildren(layerButtons, layerTable);

  appendLayers(layerTable, layers, addempty=!layerSwitch.checked, addpaddings=true);
  layerSwitch.addEventListener("change", function() {
    layerTable.replaceChildren();
    appendLayers(layerTable, layers, addempty=!this.checked, addpaddings=true);
  });

}
  //  create table rows for each layer
function appendLayers(parentelement, layers, addempty=false, addpaddings = false) {

  let lastelement = null;

  layers.forEach(function(l, i) {

    if (addempty || !l.empty) {

      let layerRow = document.createElement("div");
      layerRow.className = "row mx-0";
      parentelement.appendChild(layerRow);
      if ("children" in l) {

        let accordion = document.createElement("div");

        if (addpaddings){
          accordion.className = "accordion accordion-flush px-2";
        } else {
          accordion.className = "accordion accordion-flush ps-2 pe-0";
        }
        accordion.id = "layergroup-" + l.id;


        layerRow.appendChild(accordion);

        accordion_item = document.createElement("div");
        accordion_item.className = "accordion-item";
        accordion.appendChild(accordion_item);

        accordion_header = document.createElement("div");
        accordion_header.className = "accordion-header d-flex flex-row";
        accordion_item.appendChild(accordion_header);

        accordion_header_button = document.createElement("button");
        accordion_header_button.className = "accordion-button p-0 flex-grow-1";
        accordion_header_button.setAttribute("type", "button");
        accordion_header_button.setAttribute("data-bs-toggle", "collapse");
        accordion_header_button.setAttribute("data-bs-target", "#collapseGroup" + l.id);
        accordion_header_button.setAttribute("aria-expanded", "true");
        accordion_header_button.setAttribute("aria-controls", "collapseGroup" + l.id);
        let img_cont = document.createElement("div");
        img_cont.className = "col-auto p-0";
        let layer_image = document.createElement("img");
        layer_image.src = "data:image/png;base64," + l.img;
        layer_image.style = "max-width: 100%;";
        layer_image.id  = "layer-img-" + l.id;
        layer_image.className = "layer-img";

        function click_layer_img() {
          l.v = !l.v;
          let ev = { msg: "layer-v", id: l.id, value: l.v};
          socket.send(JSON.stringify(ev));
        }

        layer_image.addEventListener("click", click_layer_img);

        img_cont.appendChild(layer_image);
        let layer_name = document.createElement("div");
        layer_name.innerHTML = l.name;
        layer_name.className = "col";
        let layer_source = document.createElement("div");
        layer_source.innerHTML = l.s;
        layer_source.className = "col-auto";
        accordion_row = document.createElement("div");
        accordion_row.className = "row mx-0";
        accordion_header.insertBefore(img_cont, accordion_header.firstChild);
        accordion_row.appendChild(layer_name);
        accordion_row.appendChild(layer_source);
        accordion_header_button.appendChild(accordion_row);

        accordion_header.appendChild(accordion_header_button);

        accordion_collapse = document.createElement("div")
        accordion_collapse.className = "accordion-collapse show";
        accordion_collapse.setAttribute("data-bs-parent", "#" + accordion.id);
        accordion_collapse.id = "collapseGroup" + l.id;
        accordion_item.appendChild(accordion_collapse);

        accordion_body = document.createElement("div");
        accordion_body.className = "accordion-body p-0";
        accordion_collapse.appendChild(accordion_body);

        appendLayers(accordion_body, l.children, addempty=addempty);
        lastelement = accordion;

      } else {
        let img_cont = document.createElement("div");
        img_cont.className = "col-auto p-0";
        let layer_image = document.createElement("img");
        layer_image.src = "data:image/png;base64," + l.img;
        layer_image.style = "max-width: 100%;";
        layer_image.id  = "layer-img-" + l.id;
        layer_image.className = "layer-img";
        function click_layer_img() {
          l.v = !l.v;
          let ev = { msg: "layer-v", id: l.id, value: l.v};
          socket.send(JSON.stringify(ev));
        }

        layer_image.addEventListener("click", click_layer_img);
        img_cont.appendChild(layer_image);
        let layer_name = document.createElement("div");
        layer_name.innerHTML = l.name;
        layer_name.className = "col";
        let layer_source = document.createElement("div");
        layer_source.innerHTML = l.s;
        layer_source.className = "col-auto pe-0";
        accordion_row = document.createElement("row");
        accordion_row.className = "row mx-0";
        accordion_row.appendChild(img_cont);
        accordion_row.appendChild(layer_name);
        accordion_row.appendChild(layer_source);

        let accordion = document.createElement("div");
        if (addpaddings) {
          accordion.className = "accordion accordion-flush px-2";
        } else {
          accordion.className = "accordion accordion-flush ps-2 pe-0";
        }
        accordion.id = "layergroup-" + l.id;
        layerRow.appendChild(accordion);

        accordion_item = document.createElement("div");
        accordion_item.className = "accordion-item";
        accordion.appendChild(accordion_item);

        accordion_header = document.createElement("div");
        accordion_header.className = "accordion-header";
        accordion_item.appendChild(accordion_header)
        accordion_header.appendChild(accordion_row);

        lastelement = accordion
      }
    }

  });

  if (addpaddings && lastelement) {
     lastelement.classList.add("pb-2");
  }
}

function updateLayerImages(layers) {
  layers.forEach(function(l) {
    let layer_image = document.getElementById("layer-img-"+l.id);
    layer_image.src = "data:image/png;base64," + l.img;

    if ("children" in l) {
      updateLayerImages(l.children);
    }
  });
}

async function updateMetaInfo(metainfo) {
  const metaInfoPane = document.getElementById("metainfo-tab-pane");
  const metaInfoButton = document.getElementById("metainfo-tab");
  metaInfoPane.replaceChildren();
  let metaRow = document.createElement("div");
  metaRow.className = "row mx-0";
  metaInfoPane.appendChild(metaRow);

  let hideMeta = true;

  let entry = {index: 0};

  for (const [key,value] of Object.entries(metainfo)) {
    metaRow.appendChild( await addAccordion(entry, key,value));
    hideMeta = false;
  }

  metaInfoButton.hidden = hideMeta;
  
}

async function addAccordion(entry, jsonKey, jsonValue) {
  let accordion = document.createElement("div");
  let i = entry.index;

  if (addpaddings){
    accordion.className = "accordion accordion-flush px-2";
  } else {
    accordion.className = "accordion accordion-flush ps-2 pe-0";
  }
  accordion.id = "metaGroup" + i;

  let accordion_item = document.createElement("div");
  accordion_item.className = "accordion-item";
  accordion.appendChild(accordion_item);

  let accordion_header = document.createElement("div");
  accordion_header.className = "accordion-header d-flex flex-row";
  accordion_item.appendChild(accordion_header);


  let accordion_collapse = document.createElement("div")
  accordion_collapse.className = "accordion-collapse show";
  accordion_collapse.setAttribute("data-bs-parent", "#" + accordion.id);
  accordion_collapse.id = "collapseGroupMeta" + i;
  accordion_item.appendChild(accordion_collapse);

  let accordion_body = document.createElement("div");
  accordion_body.className = "accordion-body p-0";
  accordion_collapse.appendChild(accordion_body);

  entry.index += 1;

  if (typeof jsonValue === 'object') {
    let accordion_header_button = document.createElement("button");
    accordion_header_button.className = "accordion-button p-0 w-auto border-bottom";
    accordion_header_button.setAttribute("type", "button");
    accordion_header_button.setAttribute("data-bs-toggle", "collapse");
    accordion_header_button.setAttribute("data-bs-target", "#collapseGroupMeta" + i);
    accordion_header_button.setAttribute("aria-expanded", "true");
    accordion_header_button.setAttribute("aria-controls", "collapseGroupMeta" + i);
    accordion_header_button.textContent = jsonKey

    accordion_header.appendChild(accordion_header_button);
    for (const [key, value] of Object.entries(jsonValue)) {
      accordion_body.appendChild(await addAccordion(entry,key,value));
    }
  } else {
    accordion_body.textContent = `${jsonKey}: ${jsonValue}`;
  }

  return accordion;

}

async function updateRdbTab(rdbinfo) {
  const rdbButton = document.getElementById("rdb-tab");
  rdbButton.hidden = false;

  categoryList.replaceChildren();
  cellList.replaceChildren();

  for (const [category,id] of Object.entries(rdbinfo.categories)) {
    opt = document.createElement("option")
    opt.value = id
    opt.textContent = category
    categoryList.appendChild(opt)
  }
  for (const [cell,id] of Object.entries(rdbinfo.cells)) {
    opt = document.createElement("option")
    opt.value = id
    opt.textContent = cell
    cellList.appendChild(opt)
  }
}

function categoryFocus(event) {
  categoryList.hidden=false;
}
function categoryFocusOut(event) {
  if (event.relatedTarget != categoryList) {
    categoryList.hidden=true;
}}
function cellFocus(event) {
  cellList.hidden=false;
}
function cellFocusOut(event) {
  if (event.relatedTarget != cellList) {
    cellList.hidden=true;
}}

async function filterCategories(input) {
  let value = input.value;
  if (value === ""){
    categoryList.options.selectedIndex=-1;
    for (let i = 0; i < categoryList.options.length; i++) {
      let option = categoryList.options[i];
      option.hidden = false;
    }
  } else {
    let regex = new RegExp(input.value, 'i')
    let selected = false;
    for (let i = 0; i < categoryList.options.length; i++) {
      let option = categoryList.options[i];
      if (regex.test(option.text)) {
        option.hidden = false;
        if (option.text === input.value) {
          selected = true;
          categoryList.options.selectedIndex = i;
        }
      } else {
        option.hidden=true;
      }
      if (!selected) {
        categoryList.options.selectedIndex=-1;
      }
    }
  }
}
async function selectCategory(event) {
  let index = event.target.selectedIndex;
  if (index >= 0) {
    let option = event.target.options[index];
    rdbCategory.value = option.text;
  }
  await sendRdbCategoryAndCell();
}
async function filterCells(input) {
  let value = input.value;
  if (value === ""){
    cellList.options.selectedIndex=-1;
    for (let i = 0; i < cellList.options.length; i++) {
      let option = cellList.options[i];
      option.hidden = false;
    }
  } else {
    let regex = new RegExp(input.value, 'i')
    let selected = false;
    for (let i = 0; i < cellList.options.length; i++) {
      let option = cellList.options[i];
      if (regex.test(option.text)) {
        option.hidden = false;
        if (option.text === input.value) {
          selected = true;
          cellList.options.selectedIndex = i;
        }
      } else {
        option.hidden=true;
      }
      if (!selected) {
        cellList.options.selectedIndex=-1;
      }
    }
  }
}
async function selectCell(event) {
  let index = event.target.selectedIndex;
  if (index >= 0) {
    let option = event.target.options[index];
    rdbCell.value = option.text;
  }
  await sendRdbCategoryAndCell();
}

async function updateRdbItems(items) {
  rdbItems.replaceChildren();

  for (const [id, tags] of Object.entries(items)) {
    let option = document.createElement("option");
    option.value = id;
    option.text = tags;
    rdbItems.appendChild(option)
  }
}

async function requestItemDrawings() {
  let json = {"msg": "rdb-selected", "items": {}}
  for (let i = 0; i < rdbItems.options.length; i++) {
    json.items[i] = rdbItems.options[i].selected;
  }
  socket.send(JSON.stringify(json));
}

async function sendRdbCategoryAndCell() {
  let categoryIndex = categoryList.selectedIndex;
  let cellIndex = cellList.selectedIndex;
  let category_id = null;
  let cell_id = null;
  if (cellIndex != -1) {
     cell_id = +cellList.options[cellIndex].value;
  }
  if (categoryIndex != -1) {
     category_id = +categoryList.options[categoryIndex].value;
  }
  socket.send(JSON.stringify({"msg": "rdb-records", "category_id": category_id, "cell_id": cell_id}))
}

//  Prevents the context menu to show up over the canvas area
canvas.addEventListener('contextmenu', function(evt) {
  evt.preventDefault();
});

canvas.addEventListener('mousemove', function (evt) {
  sendMouseEvent(canvas, "mouse_move", evt);
  evt.preventDefault();
}, false);

canvas.addEventListener('click', function (evt) {
  sendMouseEvent(canvas, "mouse_click", evt);
  evt.preventDefault();
}, false);

canvas.addEventListener('dblclick', function (evt) {
  sendMouseEvent(canvas, "mouse_dblclick", evt);
  evt.preventDefault();
}, false);

canvas.addEventListener('mousedown', function (evt) {
  sendMouseEvent(canvas, "mouse_pressed", evt);
  evt.preventDefault();
}, false);

canvas.addEventListener('mouseup', function (evt) {
  sendMouseEvent(canvas, "mouse_released", evt);
  evt.preventDefault();
}, false);

canvas.addEventListener('mouseenter', function (evt) {
  sendMouseEvent(canvas, "mouse_enter", evt);
  evt.preventDefault();
}, false);

canvas.addEventListener('mouseout', function (evt) {
  sendMouseEvent(canvas, "mouse_leave", evt);
  evt.preventDefault();
}, false);

canvas.addEventListener('wheel', function (evt) {
  sendWheelEvent(canvas, "wheel", evt);
  evt.preventDefault();
}, false);

window.addEventListener("keydown", function(evt) {
  // Check if the pressed key is the "Escape" key
  if (evt.key === "Escape" || evt.keyCode === 27) {
    evt.preventDefault();
    sendKeyEvent(canvas, "keydown", evt);
  }
});
