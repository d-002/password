let dom = {
    "shapes": null,
    "pass-container": null
};
let fastMode;

let barCols = ["#481D24", "#C5283D", "#E9724C", "#FFAD04", "#267A4C"]

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
    dom["pass-container"].style = "--percent: 50%; --col: "+barCols[4];

    resize();
    window.addEventListener("resize", resize);
};
