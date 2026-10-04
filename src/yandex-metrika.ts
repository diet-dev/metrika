import { mergeParams } from "./merge-params.ts";

// Шаг и потолок ожидания счётчика (см. whenCounter): 300 мс × 100 ≈ 30 секунд
const WAIT_MS: number = 300;
const WAIT_TICKS: number = 100;

export type YandexMetrikaOptions = {
  // dev: счётчик не создаётся, сеть не трогается — всё уходит в console
  dev?: boolean;
};

// Клиент Яндекс.Метрики: очередь до создания счётчика (watch.js грузится
// асинхронно) и пакетная отправка параметров. Без глобалов сборки — режим
// задаётся опцией, чтобы пакет не зависел от DEVELOPMENT/PRODUCTION потребителя.
export class YandexMetrika {
  private paramsData: any = {};
  private timeoutId?: ReturnType<typeof setTimeout>;
  private id: string = "";
  // Очередь того, что не смогло уехать: счётчик ещё не создан
  private waiting: ((counter: any) => void)[] = [];
  private waitTid?: ReturnType<typeof setInterval>;
  private waitTicks: number = 0;
  private readonly dev: boolean;

  constructor(options: YandexMetrikaOptions = {}) {
    this.dev = options.dev === true;
  }

  public init(id: string, onload?: (counter: any) => void): void {
    if (this.dev) {
      if (!id) {
        console.warn('Не установлено значение "COUNTER_ID"!');
      }
      return;
    }
    const t = this;
    t.id = id;
    (function (d, w, c) {
      ((w as any)[c] = (w as any)[c] || []).push(function () {
        try {
          (w as any)["yaCounter" + id] = new (w as any).Ya.Metrika({
            id,
            clickmap: false,
            trackLinks: false,
            accurateTrackBounce: false,
          });
        } catch (err) {
          console.error(err);
        }
      });
      let n = d.getElementsByTagName("script")[0],
        s = d.createElement("script"),
        f = function () {
          (n.parentNode as Node).insertBefore(s, n);
        };
      s.type = "text/javascript";
      s.async = true;
      s.src = "https://mc.yandex.ru/metrika/watch.js";
      if (onload) s.onload = () => onload(t.counter());

      if ((w as any).opera === "[object Opera]") {
        d.addEventListener("DOMContentLoaded", f, false);
      } else {
        f();
      }
    })(document, window, "yandex_metrika_callbacks");
  }

  public params(params: object | string): void {
    if (this.timeoutId) clearTimeout(this.timeoutId);

    if (typeof params === "string") {
      this.paramsData[params] = 1;
    } else {
      this.paramsData = mergeParams(this.paramsData, params);
    }
    this.timeoutId = setTimeout(() => this.sendParams(), 100);
  }

  public goal(name: string): void {
    if (this.dev) {
      // В разработке счётчика нет (init() выходит раньше создания) — очередь разбирать некому
      console.log(`Цель: ${name}`);
      return;
    }
    this.whenCounter((counter) => {
      try {
        counter.reachGoal(name);
      } catch (err) {
        console.error(err);
      }
    });
  }

  public error(err: unknown): void {
    console.error(err);
    // err бывает и не Error (null/строка): чтение .code на null кидало бы
    // исключение внутри обработчика ошибок
    const e = err as any;
    const key: string = String((e && (e.code || e.message)) || err).trim();
    if (!this.dev) {
      this.params({ error: { [key]: 1 } });
    }
  }

  public time(name: string, started: number): void {
    const time: string = ((Date.now() - started) / 1000).toFixed(1);
    this.params({ times: { [name]: { [`${time}s`]: 1 } } });
  }

  private sendParams(): void {
    const params = Object.assign({}, this.paramsData);

    if (!Object.keys(params).length) {
      return;
    }
    try {
      removeNullValues(params);
      if (this.dev) {
        console.log("Параметры визита:", JSON.stringify(params));
        this.paramsData = {};
        return;
      }
      const counter = this.counter();

      // Счётчика ещё нет — накопленное не выбрасываем и не чистим: следующая
      // попытка отправит его вместе с тем, что придёт за время ожидания
      if (!counter) {
        this.whenCounter(() => this.sendParams());
        return;
      }
      counter.params(params);
    } catch (err) {
      console.error(err);
    }
    this.paramsData = {};
  }

  // Счётчик создаётся асинхронно (watch.js грузится параллельно), а первые шаги
  // воронки уходят синхронно. Без очереди они молча пропадали.
  private whenCounter(fn: (counter: any) => void): void {
    const counter = this.counter();

    if (counter) {
      fn(counter);
      return;
    }
    this.waiting.push(fn);

    if (this.waitTid) {
      return;
    }
    this.waitTicks = 0;
    this.waitTid = setInterval(() => {
      const ready = this.counter();

      // Потолок ожидания: без него очередь тикала бы всю сессию при блокировщике/офлайне
      if (!ready && ++this.waitTicks < WAIT_TICKS) {
        return;
      }
      clearInterval(this.waitTid);
      this.waitTid = undefined;

      const queue = this.waiting;
      this.waiting = [];

      if (ready) {
        for (let i: number = 0; i < queue.length; i++) {
          queue[i](ready);
        }
      }
    }, WAIT_MS);
  }

  private counter(): any {
    if (this.dev || typeof window === "undefined") {
      return undefined;
    }
    return (window as any)["yaCounter" + this.id];
  }
}

const removeNullValues = (params: any): void => {
  for (const key in params) {
    if (params.hasOwnProperty(key)) {
      // null/undefined — мусор так же, как 0: Метрика не должна видеть пропуски
      if (params[key] === 0 || params[key] === null || params[key] === undefined) {
        delete params[key];
      } else if (typeof params[key] === "object") {
        removeNullValues(params[key]);
      }
    }
  }
};
