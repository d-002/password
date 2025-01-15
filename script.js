let dom = {
    "shapes": null,
    "show": null,
    "pass-container": null,
    "passwd": null,
    "underlines": null,
    "feedback": null,
    "tips": null
};
let fastMode;

let lastTest = 0;
let testsDelay = 100;

let apiLastTest = 0;
let apiCheckId = 0;
let apiCheckDelay = 300;

let barCols = ["#481D24", "#C5283D", "#E9724C", "#FFAD04", "#267A4C"]

// primary password check

function setCol(i, percent, comment) {
    let col = i == -1 ? "transparent" : barCols[i];
    dom["pass-container"].style = "--percent: "+percent+"%; --col: "+col;
    dom.feedback.innerHTML = comment;
}

function onChange() {
    let pwd = dom.passwd.value;

    if (!pwd.length) {
        clearTips();
        return setCol(-1, 0, "");
    }
    return scheduleTests(pwd, Date.now());

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

        canBeGuessed(pwd, can => {
            if (can)
                setCol(3, 80, "Your password is good, but can still be guessed.<br />Follow the instructions below to improve it:");
            else
                setCol(4, 100, "Congratulations! Your password is secure.");
        });
    }, delay);
}

// secondary password check

function strmult(c, n) {
    let s = "";
    for (let i = 0; i < n; i++) s += c;
    return s;
}

function clearTips() {
    dom.underlines.innerHTML = "";
    dom.tips.innerHTML = "";
}

function addTip(message, start, end, pwd) {
    let line = document.createElement("div");
    let tip = document.createElement("p");

    let offset1 = strmult("-", start);
    let content = strmult(".", end-start);
    let offset2 = strmult("-", pwd.length-end);
    line.innerHTML = "<div class=\"bar-container\"><div>"+offset1+"</div><div class=\"bar\">"+content+"</div><div>"+offset2+"</div></div>";

    tip.innerHTML = message + " ("+pwd.substring(start, end)+")";

    dom.underlines.appendChild(line);
    dom.tips.appendChild(tip);
}

function canBeGuessed(pwd, callback) {
    clearTips();

    let can = false;

    let l = pwd.length;

    // check for repeated letters
    let prev = "";
    let count = 0;

    for (let i = 0; i <= l; i++) {
        let c = i == l ? "" : pwd[i];

        if (c == prev) count++;
        else {
            if (count > 1) {
                addTip("Remove repeated letters", i-count, i, pwd);
                can = true;
            }
            count = 1;
        }

        prev = c;
    }

    // check for ascending or descending sequences
    let prevCode = -1;
    let prevD = -1;
    count = 0;

    for (let i = 0; i <= l; i++) {
        let code = i == l ? -1 : pwd.charCodeAt(i);

        let d = Math.abs(code-prevCode);
        if (d == prevD || prevD == -1) count++;
        else {
            if (count > 1 && prevD > 0 && prevD < 3) {
                addTip("Remove predictable letter sequences", i-count-1, i, pwd);
                can = true;
            }
            count = 1;
        }

        prevCode = code;
        prevD = d;
    }

    // check for proportion of letters usage and compare to english language

    // check for obvious addition of numbers or symbols

    // check for vowel alternance (vowel + 1 or 2 consonants, repeated twice)

    // check for too low of a char diversity

    // check for known passwords
    checkPwned(pwd);

    callback(can);
}

// password database checks
function checkPwned(pwd) {
    apiCheckId++;

    let id = apiCheckId;
    window.setTimeout(() => {
        // don't make too many calls
        if (apiCheckId != id) return;

        let hash = SHA1(pwd);
        let hashStart = hash.substring(0, 5);

        fetch("https://api.pwnedpasswords.com/range/"+hashStart).then(response => {
            if (!response.ok) {
                console.error("Failed to fetch password hash database, status "+response.status);
                return;
            }

            response.text().then(text => {
                let found = 0;

                text.split("\n").forEach(line => {
                    let [hash2, count] = line.split(":");
                    hash2 = hash2.toLowerCase();

                    if (!count) return;
                    if (hash != hashStart+hash2) return;

                    found = count;
                });

                apiLastTest = Date.now();
                if (found) {
                    let count = "(at least "+found+" time"+(found > 1 ? "s)" : ")");
                    setCol(0, 100, "WARNING: this password appeared in a data breach!<br />"+count+"<br />More info below");
                    clearTips();
                }
            });
        });
    }, Math.max(apiCheckDelay-apiLastTest, 0));
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
    dom.passwd.focus();

    resize();
    window.addEventListener("resize", resize);
};
