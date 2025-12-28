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
	ArcElement,
	DoughnutController
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
	ArcElement,
	DoughnutController
);

// Configure default font and text color to match UI
ChartJS.defaults.font = {
	...ChartJS.defaults.font,
	family: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif'
};
ChartJS.defaults.color = '#86868B'; // Tertiary Text

// Export configured Chart instance
export { ChartJS };
export default ChartJS;
