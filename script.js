(() => {
  const expressionEl = document.getElementById("expression");
  const resultEl = document.getElementById("result");
  const keys = document.querySelectorAll(".key");

  let current = "0";
  let previous = null;
  let operator = null;
  let shouldReset = false;

  function formatNumber(value) {
    if (!Number.isFinite(value)) return "错误";
    const str = String(value);
    if (str.includes("e")) return str;
    const [intPart, decPart] = str.split(".");
    const formattedInt = Number(intPart).toLocaleString("en-US");
    return decPart !== undefined ? `${formattedInt}.${decPart}` : formattedInt;
  }

  function updateDisplay() {
    resultEl.textContent = formatNumber(Number(current)) === "错误"
      ? "错误"
      : current.includes(".")
        ? current
        : formatNumber(Number(current));

    if (previous !== null && operator) {
      expressionEl.textContent = `${formatNumber(Number(previous))} ${operator}`;
    } else {
      expressionEl.textContent = "";
    }

    document.querySelectorAll(".key-op").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.value === operator && !shouldReset);
    });
  }

  function inputDigit(digit) {
    if (shouldReset) {
      current = digit;
      shouldReset = false;
      return;
    }
    if (current === "0" && digit !== "0") {
      current = digit;
    } else if (current === "0" && digit === "0") {
      current = "0";
    } else if (current.replace("-", "").replace(".", "").length < 12) {
      current += digit;
    }
  }

  function inputDecimal() {
    if (shouldReset) {
      current = "0.";
      shouldReset = false;
      return;
    }
    if (!current.includes(".")) {
      current += ".";
    }
  }

  function clearAll() {
    current = "0";
    previous = null;
    operator = null;
    shouldReset = false;
  }

  function toggleSign() {
    if (current === "0" || current === "错误") return;
    current = current.startsWith("-") ? current.slice(1) : `-${current}`;
  }

  function percent() {
    const value = Number(current);
    if (!Number.isFinite(value)) return;
    current = String(parseFloat((value / 100).toPrecision(12)));
  }

  function compute(a, b, op) {
    switch (op) {
      case "+":
        return a + b;
      case "−":
        return a - b;
      case "×":
        return a * b;
      case "÷":
        return b === 0 ? NaN : a / b;
      default:
        return b;
    }
  }

  function setOperator(nextOp) {
    const value = Number(current);
    if (!Number.isFinite(value)) {
      clearAll();
      return;
    }

    if (previous !== null && operator && !shouldReset) {
      const result = compute(Number(previous), value, operator);
      if (!Number.isFinite(result)) {
        current = "错误";
        previous = null;
        operator = null;
        shouldReset = true;
        return;
      }
      current = String(parseFloat(result.toPrecision(12)));
      previous = current;
    } else {
      previous = current;
    }

    operator = nextOp;
    shouldReset = true;
  }

  function equals() {
    if (previous === null || !operator) return;
    const result = compute(Number(previous), Number(current), operator);
    if (!Number.isFinite(result)) {
      current = "错误";
    } else {
      current = String(parseFloat(result.toPrecision(12)));
    }
    previous = null;
    operator = null;
    shouldReset = true;
  }

  function handleAction(action, value) {
    switch (action) {
      case "digit":
        inputDigit(value);
        break;
      case "decimal":
        inputDecimal();
        break;
      case "clear":
        clearAll();
        break;
      case "sign":
        toggleSign();
        break;
      case "percent":
        percent();
        break;
      case "operator":
        setOperator(value);
        break;
      case "equals":
        equals();
        break;
      default:
        break;
    }
    updateDisplay();
  }

  keys.forEach((key) => {
    key.addEventListener("click", () => {
      handleAction(key.dataset.action, key.dataset.value);
    });
  });

  document.addEventListener("keydown", (event) => {
    if (document.getElementById("contra-panel")?.classList.contains("is-open")) {
      return;
    }

    const { key } = event;

    if (/^[0-9]$/.test(key)) {
      handleAction("digit", key);
      return;
    }

    if (key === ".") {
      handleAction("decimal");
      return;
    }

    if (key === "Enter" || key === "=") {
      event.preventDefault();
      handleAction("equals");
      return;
    }

    if (key === "Escape" || key === "c" || key === "C") {
      handleAction("clear");
      return;
    }

    if (key === "%") {
      handleAction("percent");
      return;
    }

    if (key === "Backspace") {
      if (shouldReset) return;
      current = current.length <= 1 || (current.length === 2 && current.startsWith("-"))
        ? "0"
        : current.slice(0, -1);
      updateDisplay();
      return;
    }

    const keyboardOps = {
      "+": "+",
      "-": "−",
      "*": "×",
      "/": "÷",
      "x": "×",
      "X": "×",
    };

    if (keyboardOps[key]) {
      event.preventDefault();
      handleAction("operator", keyboardOps[key]);
    }
  });

  updateDisplay();
})();
