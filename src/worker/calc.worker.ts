import { calculate } from "../domain/calculate";
import type { ParsedValue } from "../domain/parse";

self.onmessage = (event: MessageEvent<ParsedValue[]>) => {
  postMessage(calculate(event.data));
};
