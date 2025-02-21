import {
  _adapters,
  CategoryScale,
  Chart,
  Colors,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  TimeScale,
  Tooltip,
  type ChartDataset,
} from 'chart.js/auto';
 
import data from '../result.csv?raw';
import './style.css';

Chart.register(
  Colors,
  LineElement,
  CategoryScale,
  PointElement,
  LineController,
  LinearScale,
  TimeScale,
  Legend,
  Tooltip,
);

const DAY = 1000 * 60 * 60 * 24;

_adapters._date.override({
  formats: () => ({ day: 'YYYY' }),
  parse: (value) => new Date(value as string).getTime(),
  startOf: (value) => value,
  endOf: (value) => value,
  format: (value) => new Date(value).toISOString().split('T')[0],
  diff: (min, max) => (max - min) / DAY,
  add: (value, amount) => value + amount * DAY,
})

// console.log(data);

const parsedData = data.split('\n').map(line => {
  const [date, countDrones, sum, totalDrones] = line.split(';') ;
  return {date: new Date(date), countDrones, sum, totalDrones};
}).reverse();
const fastIndex: Record<string, typeof parsedData[0]> = Object.fromEntries(parsedData.map(e => [e.date, e]))

const canvas = document.querySelector<HTMLDivElement>('#chart')! as unknown as HTMLCanvasElement;
if (!canvas) throw new Error('No canvas');
const general: Omit<ChartDataset<'line'>, 'data' | 'label'> = {
  parsing: false,
  normalized: true,
  spanGaps: true,
  segment: {
    borderColor: ctx => ctx.p0.skip ? 'rgb(0,0,0,0.2)' : undefined,
    borderDash: ctx => ctx.p0.skip ? [6, 6] : undefined,
  },
}
new Chart(canvas, {
  type: 'line',
  data: {
    labels: parsedData.map(({date}) => date),
    datasets: [
      {
        ...general,
        label: 'Кількість дронів',
        data: parsedData.map(({countDrones, date}) => ({ y: parseInt(countDrones), x: date })),
      },
      {
        ...general,
        label: 'Сума дронів',
        data: parsedData.map(({totalDrones, date}) => ({y: parseInt(totalDrones), x: date})),
      },
      {
        ...general,
        label: 'Ціна дрону',
        data: parsedData.map(({totalDrones, sum, date}) => {
          const uah = sum.match(/([\d.]+) млн гривень/);
          if (uah) {
            return {y: +uah[1] * 1000000 / +totalDrones, x: date};
          }
          return {y: undefined, x: date};
        }),
      },
    ],
  },
  options: {
    // animation: false,
    interaction: {
      intersect: false,
      mode: 'index',
    },
    scales: {
     x: {
      type: 'time',
     },
    },
    onClick: (_, elements) => {
      console.log(elements);
    },
    plugins: {
      tooltip: {
        position: 'nearest',
        callbacks: {
          footer: (items) => {
            const item = items.map<typeof parsedData[0]>(e => fastIndex[(e.raw as {x: string}).x]).find(e => e);
            if (item) {
              // const uah = item.sum.match(/([\d.]+) млн гривень/);
              const result = [item.sum];
              // if (uah) {
              //   result.push(`Ціна дрону: ${(+uah[1] * 1000000 / +item.countDrones)} гривень`);
              // }
              return result;
            }
            // return 'qqq'
          }
        }
      }
    }
  },
});