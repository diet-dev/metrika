# @dietdev/metrika

Клиент Яндекс.Метрики: загрузка счётчика (`watch.js`), очередь вызовов до его
создания и пакетная отправка параметров (склейка за 100 мс).

## Установка

```bash
npm i @dietdev/metrika
```

## Использование

```ts
import { YandexMetrika } from "@dietdev/metrika";

const metrika = new YandexMetrika({ dev: import.meta.env.DEV });
metrika.init("YOUR_COUNTER_ID", (counter) => {
  // счётчик готов
});

metrika.params({ versions: { ["v1.2.3"]: 1 } });
metrika.goal("run_start");
metrika.error(err); // console.error + параметр error в проде
metrika.time("load", t0); // параметр times.<name>.<сек>s
```

`dev: true` (по умолчанию `false`) означает «счётчика нет»: `init()` не грузит
скрипт, `params`/`goal` пишут в `console` вместо сети. Так пакет не зависит от
`DEVELOPMENT`/`PRODUCTION` потребителя.

## API

- `new YandexMetrika({ dev? })`
- `init(id, onload?)` — создаёт счётчик (`window["yaCounter" + id]`).
- `params(object | string)` — копит и отправляет через 100 мс.
- `goal(name)` — цель Метрики (в очереди, если счётчик ещё не готов).
- `error(err)` — лог ошибки; в проде уходит как параметр `error`.
- `time(name, started)` — замер длительности.

## Разработка

```bash
npm run build
npm run typecheck
npm test
```
