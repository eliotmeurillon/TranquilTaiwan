import {
	Chart as ChartJS,
	CategoryScale,
	LinearScale,
	PointElement,
	LineElement,
	LineController,
	Title,
	Tooltip,
	Legend,
	RadialLinearScale,
	RadarController,
	Filler,
	BarElement,
	BarController,
	ArcElement
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
	CategoryScale,
	LinearScale,
	PointElement,
	LineElement,
	LineController,
	Title,
	Tooltip,
	Legend,
	RadialLinearScale,
	RadarController,
	Filler,
	BarElement,
	BarController,
	ArcElement
);

// Configure default font and text color to match UI
ChartJS.defaults.font = {
	...ChartJS.defaults.font,
	family: 'Inter, system-ui, -apple-system, sans-serif'
};
ChartJS.defaults.color = '#64748b'; // Slate-500

// Export configured Chart instance
export { ChartJS };
export default ChartJS;

