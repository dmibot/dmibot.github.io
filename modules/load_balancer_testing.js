// Data ISP untuk simulasikan pengujian
let ispData = {
    'ISP 1': { ping: 0, latency: 0 },
    'ISP 2': { ping: 0, latency: 0 },
};

// Fungsi untuk melakukan ping
function pingTest(ip) {
    const pingTime = Math.floor(Math.random() * 100) + 10; // Simulasi ping
    ispData[ip].ping = pingTime;
    document.getElementById('output').value = `Ping ke ${ip}: ${pingTime} ms`;
    updateGraph();
}

// Fungsi untuk melakukan traceroute
function tracerouteTest(ip) {
    let tracerouteResult = `Traceroute ke ${ip}:\n`;
    let hops = Math.floor(Math.random() * 6) + 3; // Simulasi hops
    for (let i = 1; i <= hops; i++) {
        tracerouteResult += `Hop ${i}: ${ip} - ${Math.floor(Math.random() * 50) + 20}ms\n`;
    }
    document.getElementById('output').value = tracerouteResult;
    const latencyTime = Math.floor(Math.random() * 50) + 10;
    ispData[ip].latency = latencyTime;
    updateGraph();
}

// Fungsi untuk memperbarui grafik performa
function updateGraph() {
    const ctx = document.getElementById('networkPerformance').getContext('2d');
    const data = {
        labels: Object.keys(ispData),
        datasets: [
            {
                label: 'Ping (ms)',
                data: Object.values(ispData).map((data) => data.ping),
                borderColor: 'rgba(75, 192, 192, 1)',
                fill: false,
            },
            {
                label: 'Latency (ms)',
                data: Object.values(ispData).map((data) => data.latency),
                borderColor: 'rgba(255, 99, 132, 1)',
                fill: false,
            },
        ],
    };

    const options = {
        scales: {
            y: {
                beginAtZero: true,
            },
        },
    };

    if (window.chart) {
        window.chart.destroy();
    }

    window.chart = new Chart(ctx, {
        type: 'line',
        data: data,
        options: options,
    });
}
