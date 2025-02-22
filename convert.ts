import { readFileSync } from 'fs';

const data = readFileSync('result.csv', 'utf8');

const lines = data.split('\n');

function multiply(value: string | undefined) {
  if (!value) { return 1; }
  if (value === 'к') { return 1000; }
  if (value === 'мільйони') { return 1000000; }
  if (value === 'млн') { return 1000000; }
  throw new Error('Unknown multiplier: ' + value);
}
function parseValue(value: string | undefined) {
  // 5.5 млн
  // 123 к
  // 123 000

  if (!value) { return; }

  const parsed = value.replace(/ /g, '').match(/([\d. ]+)(млн|мільйони|к)?/);
  if (parsed) {
    return +parsed[1] * multiply(parsed[2]);
  }
}

function parsePrice(price: string) {
  // 5.5 млн гривень та 7.5 к доларів
  if (!price) { return; }
  const parsed = price.match(/([\d. ]+(?: млн|мільйони)?) (?:гривень|грн)(?: (?:та|і) ((?:[\d. ]+)(?: к)?) доларів)?/);
  if (parsed) {
    // console.log(price, '->', parsed[1], parsed[2]);
    return {
      uah: parseValue(parsed[1]),
      usd: parseValue(parsed[2])
    };
  }
  throw new Error('Unknown price format: ' + price);
}

const result = lines.map(line => {
    const [date, count, price, total] = line.split(';');
    return {
      ...parsePrice(price),
        raw: line,
        date,
        count: parseInt(count),
        price,
        total: parseInt(total)
    };
});

result.forEach(item => {
  const newLine = `${item.date};${item.count || ''};${item.uah || ''};${item.usd || ''};${item.total || ''}`;
  console.log(`${item.raw} -> ${newLine}`);
});