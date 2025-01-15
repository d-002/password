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

let vowels = "aeiou";
let consonants = "bcdfghjklmnpqrstvwxyz";

let testLast = 0;
let testCheckId = 0;
let testCheckDelay = 100;

let apiLastTest = 0;
let apiCheckId = 0;
let apiCheckDelay = 300;

let barCols = ["#481D24", "#C5283D", "#E9724C", "#FFAD04", "#267A4C"]

let dictionaryLoaded = false;
let dictionary = new Set(["pwd", "usr", "sudo", "mac", "ios", "linux", "jan", "feb", "mar", "apr", "jun", "sep", "oct", "nov", "dec"]);

// dictionary setup

function loadDictionary() {
    let prev = Date.now();

    fetch("https://raw.githubusercontent.com/filiph/english_words/master/data/word-freq-top5000.csv").then(response => {
        if (!response.ok) {
            console.error("Failed to fetch dictionary, status "+response.status);
            return;
        }

        let first = true;
        response.text().then(text => {
            text.split("\n").forEach(line => {
                if (first) {
                    first = false;
                    return;
                }

                if (!line) return;
                let word = line.split(",")[1];

                if (word.length < 3) return;
                dictionary.add(word);
            });

            dictionaryLoaded = true;
            console.log("Done loading dictionary (took "+(Date.now()-prev)+"ms)");
        });
    });
}

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

    checkPwned(pwd);

    if (pwd.length < 12)
        return setCol(0, pwd.length / 0.28, "Good passwords are at least 12 characters long.");

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

    scheduleTests(pwd);
}

function scheduleTests(pwd) {
    testCheckId++;

    let id = testCheckId;

    window.setTimeout(() => {
        // don't check too many times to save resources
        if (testCheckId != id) return;

        canBeGuessed(pwd, can => {
            if (can)
                setCol(3, 80, "Your password is good, but can still be guessed.<br />Follow the instructions below to improve it:");
            else
                setCol(4, 100, "Congratulations! Your password is secure.");
        });

        testLast = Date.now();
    }, Math.max(testCheckDelay-testLast, 0));
}

// bars handling

function clearTips() {
    dom.underlines.innerHTML = "";
    dom.tips.innerHTML = "";
}

function onHoverTip(evt, enter) {
    let target = evt.target;
    // target can be the container: do nothing
    if (target == dom.underlines || target == dom.tips) return;

    // target can be an element inside the relevant element
    while (target.parentNode.id == "" && target != document.body) target = target.parentNode;
    if (target == document.body) return; // failsafe

    let i = Array.from(target.parentNode.children).indexOf(target);
    let className = enter ? "hover" : "";
    dom.underlines.children[i].className = className;
    dom.tips.children[i].className = className;
}

let onHoverTipE = evt => onHoverTip(evt, true);
let onHoverTipL = evt => onHoverTip(evt, false);

function addTip(message, start, end, pwd, addSubstring=true) {
    let line = document.createElement("div");
    let tip = document.createElement("p");

    let offset1 = strmult("-", start);
    let content = strmult(".", end-start);
    let offset2 = strmult("-", pwd.length-end);
    line.innerHTML = "<div class=\"bar-container\"><div>"+offset1+"</div><div class=\"bar\">"+content+"</div><div>"+offset2+"</div></div>";

    if (addSubstring) message += " ("+pwd.substring(start, end)+")";
    tip.innerHTML = message;

    dom.underlines.appendChild(line);
    dom.tips.appendChild(tip);
}

// secondary password check

function strmult(c, n) {
    let s = "";
    for (let i = 0; i < n; i++) s += c;
    return s;
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

    // check for inclusion of common words
    if (dictionaryLoaded)
        for (let i = 0, I = l-2; i < I; i++) {
            for (let j = i+3; j <= l; j++) {
                let word = pwd.substring(i, j).toLowerCase();

                if (dictionary.has(word))
                    addTip("Detected a common English word", i, j, pwd);
            }
        }
    else addTip("Dictionary is not yet loaded, continue typing for English words suggestions", 0, 0, pwd, false);

    // check for obvious addition of numbers or symbols
    for (let n = 0; n < 2; n++) {
        let type = n ? "special characters" : "numbers";

        let lastLetter = 0;
        let firstNonLetter = 0;
        for (let i = 0; i < l; i++) {
            let code = pwd.charCodeAt(i);

            if (code >= 97 && code <= 122) lastLetter = i;
            else if (code >= 65 && code <= 97) lastLetter = i;
            else {
                let isNumber = code >= 48 && code <= 57;
                if ((n ^ isNumber) && !firstNonLetter) firstNonLetter = i;
            }
        }

        if (firstNonLetter > lastLetter)
            addTip("Don't just append "+type+", place them randomly inside your password", firstNonLetter, pwd.length, pwd, false);
    }

    // check for vowel alternance
    let lastType = 2; // 0 for vowel, 1 for consonant, 2 for other
    count = 0;

    for (let i = 0; i <= l; i++) {
        let c = i == l ? "\0" : pwd[i].toLowerCase();

        let vowel = vowels.includes(c);
        let consonant = consonants.includes(c);
        let type = vowel ? 0 : consonant ? 1 : 2;

        if (type == 2 || type == lastType) {
            if (count > 2) addTip("Avoid vowel/consonant patterns, since they look like words", i-count-1, i, pwd);
            count = 0;
        }
        else if (lastType != 2 && (type ^ lastType)) count++;

        lastType = type;
    }

    // check for too low of a char diversity
    let lettersCount = 0;
    let letters = [];
    Array.from(pwd).forEach(c => {
        let code = c.charCodeAt(0);
        if (!letters.includes(code)) letters.push(code);
        lettersCount++;
    });

    if (letters.length / lettersCount <= 0.6)
        addTip("Use more diverse letters (not always the same ones)", 0, pwd.length, pwd, false);

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
                    if (!line) return;

                    let [hash2, count] = line.split(":");
                    hash2 = hash2.toLowerCase();

                    if (!count) return;
                    if (hash != hashStart+hash2) return;

                    found = count;
                });

                if (found) {
                    let count = "(at least "+found+" time"+(found > 1 ? "s)" : ")");
                    setCol(0, 100, "WARNING: this password appeared in a data breach!<br />"+count+"<br />More info below");
                    clearTips();
                }

                apiLastTest = Date.now();
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

    loadDictionary();

    loadFastMode();
    dom.passwd.addEventListener("input", onChange);
    dom.passwd.focus();

    underlines.addEventListener("mouseover", onHoverTipE);
    underlines.addEventListener("mouseout", onHoverTipL);
    tips.addEventListener("mouseover", onHoverTipE);
    tips.addEventListener("mouseout", onHoverTipL);

    resize();
    window.addEventListener("resize", resize);
};
