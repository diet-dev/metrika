// Метрика копит параметры и раньше склеивала их Object.assign — поверхностно,
// из-за чего события с общим верхним ключом (coins_earned) затирали друг друга
// целиком. Чистая функция без импортов.

export function mergeParams(target: any, source: any): any {
  const out: any = {};

  for (const key in target) {
    if (Object.prototype.hasOwnProperty.call(target, key)) {
      out[key] = target[key];
    }
  }
  for (const key in source) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) {
      continue;
    }
    const a: any = out[key];
    const b: any = source[key];

    // Сливаем только простые объекты: числа, строки и массивы заменяются целиком
    if (isPlainObject(a) && isPlainObject(b)) {
      out[key] = mergeParams(a, b);
    } else {
      out[key] = b;
    }
  }
  return out;
}

function isPlainObject(value: any): boolean {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
