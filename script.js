let dom = {
    "shapes": null
};
let fastMode;

function loadFastMode() {
    fastMode = parseInt(localStorage.getItem("fastMode")) || 0;
    applyFastMode();
}

function toggleFastMode() {
    fastMode = 1-fastMode;
    applyFastMode();
}

function applyFastMode() {
    dom.shapes.className = fastMode ? "fast" : "";
    localStorage.setItem("fastMode", fastMode);
}

function resize() {
    let mobile = document.body.clientHeight > document.body.clientWidth;
    document.body.className = mobile ? "mobile" : "";
}

window.onload = () => {
    Object.keys(dom).forEach(id => dom[id] = document.getElementById(id));

    loadFastMode();

    resize();
    window.addEventListener("resize", resize);
};
