import { useEffect, useRef } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

export default function ProgressChart({ progressHistory = [0], performanceHistory = [0], loading = false }) {
  const chartRef = useRef();

  // Build labels based on number of points
  // First point is "Start", then number lessons completed
  const labels = progressHistory.map((_, i) => {
    if (i === 0) return 'Start';
    return `L${i}`; // L1, L2, L3...
  });
  const data = {
    labels,
    datasets: [
      {
        label: "Learning Progress",
        data: progressHistory,
        borderColor: "#0A3041",
        backgroundColor: "rgba(10,48,65,0.15)",
        tension: 0.4,
        pointRadius: 5,
        pointHoverRadius: 8,
        pointBackgroundColor: "#0A3041",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        fill: true,
      },
      {
        label: "Performance Score",
        data: performanceHistory,
        borderColor: "#22c55e",
        backgroundColor: "rgba(34,197,94,0.15)",
        tension: 0.4,
        pointRadius: 5,
        pointHoverRadius: 8,
        pointBackgroundColor: "#22c55e",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        fill: true,
      },
    ],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    scales: {
      y: { 
        beginAtZero: true, 
        max: 100,
        ticks: { 
          color: '#0A3041',
          font: { size: 11 },
          callback: function(value) {
            return value + '%';
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        title: {
          display: true,
          text: 'Percentage (%)',
          color: '#0A3041',
          font: { size: 12, weight: 'bold' }
        }
      },
      x: { 
        ticks: { 
          color: '#0A3041',
          font: { size: 10 },
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 15
        },
        grid: {
          display: false,
        },
        title: {
          display: true,
          text: 'Learning Journey Progress',
          color: '#0A3041',
          font: { size: 12, weight: 'bold' }
        }
      }
    },
    plugins: {
      legend: { 
        display: true,
        position: 'top',
        labels: { 
          color: '#0A3041',
          font: { size: 12, weight: 'bold' },
          padding: 15,
          usePointStyle: true,
          pointStyle: 'circle'
        } 
      },
      tooltip: {
        backgroundColor: '#fff',
        titleColor: '#0A3041',
        bodyColor: '#0A3041',
        borderColor: '#0A3041',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        callbacks: {
          label: function(context) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: ${value.toFixed(1)}%`;
          },
          title: function(context) {
            const index = context[0].dataIndex;
            if (index === 0) return 'Starting Point';
            return `After Lesson ${index}`;
          }
        }
      },
    },
    animation: {
      duration: 900,
      easing: 'easeOutQuart',
    },
    elements: {
      line: { borderWidth: 3 },
    },
  };
  return (
    <div className="bg-white p-4 rounded-xl shadow-md h-full min-h-[18rem] flex items-center justify-center" role="img" aria-label="Progress and performance line chart">
      {loading ? (
        <div className="flex flex-col items-center text-textLight">
          <span className="animate-spin text-3xl mb-2">🔄</span>
          <span>Loading chart...</span>
        </div>
      ) : (
        <Line ref={chartRef} data={data} options={options} />
      )}
    </div>
  );
}
