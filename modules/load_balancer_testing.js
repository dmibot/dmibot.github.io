// Data ISP untuk menyimpan hasil ping dan latensi
let ispData = {
    'ISP 1': { ping: 0, latency: 0 },
    'ISP 2': { ping: 0, latency: 0 },
};

// Fungsi untuk melakukan Ping Test
function pingTest(ip) {
    const pingTime = Math.floor(Math.random() * 100) + 10; // Simulasi waktu ping (ms)
    ispData[ip].ping = pingTime;  // Menyimpan hasil ping ke ISP

    // Tampilkan hasil ping di textarea
    document.getElementById('output').value = `Ping ke ${ip}: ${pingTime} ms`;

    // Memperbarui grafik performa
    updateGraph();
}

// Fungsi untuk melakukan Traceroute Test
function tracerouteTest(ip) {
    let tracerouteResult = `Traceroute ke ${ip}:\n`;
    let hops = Math.floor(Math.random() * 6) + 3; // Simulasi jumlah hops (3 hingga 8)
    for (let i = 1; i <= hops; i++) {
        tracerouteResult += `Hop ${i}: ${ip} - ${Math.floor(Math.random() * 50) + 20}ms\n`;
    }
    document.getElementById('output').value = tracerouteResult;  // Tampilkan hasil traceroute

    const latencyTime = Math.floor(Math.random() * 50) + 10;  // Simulasi latensi
    ispData[ip].latency = latencyTime;  // Menyimpan latensi ISP

    // Memperbarui grafik performa
    updateGraph();
}

// Fungsi untuk memperbarui grafik performa jaringan
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

    // Jika grafik sudah ada, hancurkan dan buat yang baru
    if (window.chart) {
        window.chart.destroy();
    }

    // Membuat grafik baru dengan data yang telah diperbarui
    window.chart = new Chart(ctx, {
        type: 'line',
        data: data,
        options: options,
    });
}
