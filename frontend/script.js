const table = document.getElementById("table");
const search = document.getElementById("search");
const results = document.getElementById("results");

let rows = {};

// ===== WEBSOCKET =====
const ws = new WebSocket("ws://localhost:8000/ws");

ws.onopen = () => console.log("WS connected");
ws.onerror = () => alert("❌ WebSocket failed");

ws.onmessage = (e) => {
    const data = JSON.parse(e.data);

    if (!rows[data.symbol]) {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${data.symbol}</td>
            <td class="vol">0</td>
            <td>${data.threshold}</td>
            <td class="status">⏳</td>
        `;

        table.appendChild(row);
        rows[data.symbol] = row;
    }

    rows[data.symbol].querySelector(".vol").innerText = data.volume;

    rows[data.symbol].querySelector(".status").innerText =
        data.alerted ? "🚨" : "⏳";
};

// ===== SEARCH =====
search.addEventListener("input", async () => {
    const q = search.value;
    if (q.length < 2) return;

    const res = await fetch(`/search?q=${q}`);
    const data = await res.json();

    results.innerHTML = "";

    data.forEach(stock => {
        const div = document.createElement("div");
        div.innerText = stock.symbol;

        div.onclick = () => addStock(stock);

        results.appendChild(div);
    });
});

// ===== ADD STOCK =====
function addStock(stock) {
    const threshold = prompt("Enter volume threshold:");

    fetch("/add-stock", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            symbol: stock.symbol,
            token: stock.token,
            threshold: threshold
        })
    });
}