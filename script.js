let dom = {
    "shapes": null,
    "show": null,
    "pass-container": null,
    "passwd": null,
    "feedback": null,
    "tips": null
};
let fastMode;

let lastTest = 0;
let testsDelay = 100;

let barCols = ["#481D24", "#C5283D", "#E9724C", "#FFAD04", "#267A4C"]

// primary password check

function setCol(i, percent, comment) {
    let col = i == -1 ? "transparent" : barCols[i];
    dom["pass-container"].style = "--percent: "+percent+"%; --col: "+col;
    dom.feedback.innerHTML = comment;
}

function onChange() {
    let pwd = dom.passwd.value;

    if (!pwd.length)
        return setCol(-1, 0, "");

    if (pwd.length < 14)
        return setCol(0, pwd.length / 0.28, "Good passwords are at least 14 characters long.");

    let lowercase = false, uppercase = false, digit = false, special = false;
    Array.from(pwd).forEach(c => {
        let code = c.charCodeAt(0);
        if (code >= 97 && code <= 122) lowercase = true;
        else if (code >= 65 && code <= 97) uppercase = true;
        else if (code >= 48 && code <= 57) digit = true;
        else special = true;
    });

    let sum = lowercase + uppercase + digit + special;
    if (sum < 4) {
        let type = lowercase ? uppercase ? digit ? "a special character" : "a digit" : "an uppercase letter" : "a lowercase letter";
        return setCol((lowercase || uppercase) + digit + special, 50 + sum * 7.5, "Your password can easily be guessed, try adding "+type);
    }

    scheduleTests(pwd, Date.now());
}

function scheduleTests(pwd, ts) {
    // limit the rate at which tests should be run

    let dt = ts-lastTest;
    let delay;

    if (dt > testsDelay) delay = 0;
    else delay = testsDelay-dt;

    window.setTimeout(() => {
        // only trigger this once per "batch"
        if (Date.now()-lastTest < testsDelay) return;
        lastTest = Date.now();

        if (canBeGuessed(pwd))
            setCol(3, 80, "Your password is good, but can still be guessed");
        else
            setCol(4, 100, "Congratulations! Your password is secure.");
    }, delay);
}

// secondary password check

function addTip(message, start, end) {
    let bar = document.createElement("div");
    let li = document.createElement("li");

    dom.underlines.appendChild(line);
    dom.tips.appendChild(li);
}
function canBeGuessed(pwd) {
    let ok = true;
    dom.tips.innerHTML = "";

    return ok;
}

// listeners

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

function updateShow() {
    let show = dom.show.checked;
    dom.passwd.type = show ? "text" : "password";
}

function resize() {
    let mobile = document.body.clientHeight > document.body.clientWidth;
    document.body.className = mobile ? "mobile" : "";
}

// page start

window.onload = () => {
    Object.keys(dom).forEach(id => dom[id] = document.getElementById(id));

    loadFastMode();
    dom.passwd.addEventListener("input", onChange);

    resize();
    window.addEventListener("resize", resize);
};
