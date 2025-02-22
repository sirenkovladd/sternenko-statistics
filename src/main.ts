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
  type ChartOptions,
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

function getTotalPrice(uah: string, usd: string, exchange: string) {
  if (!uah && !usd) return undefined;
  let total = 0;
  if (uah) {
    total = +uah;
  }
  if (usd) {
    if (!exchange) {
      throw new Error('No exchange rate');
    }
    total += +usd * +exchange;
  }
  return total;
}

const parsedData = data.split('\n').map(line => {
  const [date, countDrones, uah, usd, totalDrones, exchange] = line.split(';');
  const totalPrice = getTotalPrice(uah, usd, exchange);
  return {date: new Date(date), countDrones, uah, usd, totalDrones, exchange, totalPrice, dronePrice: totalPrice ? +(totalPrice / +countDrones).toFixed(2) : undefined};
}).reverse();
const fastIndex: Record<string, typeof parsedData[0]> = Object.fromEntries(parsedData.map(e => [e.date, e]))

const general: Omit<ChartDataset<'line'>, 'data' | 'label'> = {
  parsing: false,
  normalized: true,
  spanGaps: true,
  segment: {
    borderColor: ctx => ctx.p0.skip ? 'rgb(0,0,0,0.2)' : undefined,
    borderDash: ctx => ctx.p0.skip ? [6, 6] : undefined,
  },
}

const options = (footer: (item: typeof parsedData[0]) => string[]): ChartOptions<'line'> => ({
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
            return footer(item);
          }
        }
      }
    }
  }
});
const canvas = document.querySelector<HTMLDivElement>('#chart')! as unknown as HTMLCanvasElement;
if (!canvas) throw new Error('No canvas');
new Chart(canvas, {
  type: 'line',
  data: {
    labels: parsedData.map(({date}) => date),
    datasets: [
      {
        ...general,
        label: 'Кількість дронів за день',
        data: parsedData.map(({countDrones, date}) => ({ y: parseInt(countDrones), x: date })),
      },
      {
        ...general,
        label: 'Загальна кількість дронів',
        data: parsedData.map(({totalDrones, date}) => ({y: parseInt(totalDrones), x: date})),
      },
    ],
  },
  options: options((item) => { 
      const result = [];
      if (item.uah) {
        result.push(`Витрачено гривень: ${(+item.uah / 1000000).toFixed(2)} млн гривень`);
      }
      if (item.usd && item.exchange) {
        result.push(`Витрачено доларів: ${(+item.usd / 1000).toFixed(2)} к доларів за курсом ${item.exchange} доларів`);
      }
      if (item.totalPrice) {
        result.push(`Витрати на дрони: ${(+item.totalPrice / 1000000).toFixed(2)} млн гривень`);
        result.push(`Ціна дрону: ${item.dronePrice} гривень`);
      }
      return result;
  }),
});

const canvasPrice = document.querySelector<HTMLDivElement>('#chart-price')! as unknown as HTMLCanvasElement;
if (!canvasPrice) throw new Error('No canvas');
new Chart(canvasPrice, {
  type: 'line',
  data: {
    labels: parsedData.map(({date}) => date),
    datasets: [
      {
        ...general,
        label: 'Витрати на дрони (млн гривень)',
        data: parsedData.map(({totalPrice, date}) => ({ y: totalPrice, x: date })),
      },
      {
        ...general,
        label: 'Ціна дрону',
        data: parsedData.map(({totalPrice, countDrones, date}) => {
          return {y: totalPrice ? +(totalPrice / +countDrones).toFixed(2) : undefined, x: date};
        }),
      },
    ],
  },
  options: options((item) => { 
    const result = [];
    if (item.uah) {
      result.push(`Витрачено гривень: ${(+item.uah / 1000000).toFixed(2)} млн гривень`);
    }
    if (item.usd && item.exchange) {
      result.push(`Витрачено доларів: ${(+item.usd / 1000).toFixed(2)} к доларів за курсом ${item.exchange} доларів`);
    }
    result.push(`Кількість дронів за день: ${item.countDrones}`);
    result.push(`Загальна кількість дронів: ${item.totalDrones}`);
    return result;
}),
});