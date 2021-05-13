import { mkdirSync } from "fs";
import { dirname } from "path";
import { EventEmitter } from "events";

export type CacheObject = {
  revalidating?: boolean;
  abs?: string;
  timestamp?: number;
  eventEmitter?: EventEmitter;
};

// from sapper
export function mkdirp(dir: string) {
  const parent = dirname(dir);
  if (parent === dir) return;

  mkdirp(parent);

  try {
    mkdirSync(dir);
  } catch (err) {
    // ignore
  }
}

// https://github.com/lukeed/sirv/blob/ede9189b6c586cd4697e0ffb16671515fdefecde/packages/sirv/index.js#L15
export function toAssume(uri: string, extns: Array<string>) {
  let i = 0,
    x,
    len = uri.length - 1;
  if (uri.charCodeAt(len) === 47) {
    uri = uri.substring(0, len);
  }

  let arr = [],
    tmp = `${uri}/index`;
  for (; i < extns.length; i++) {
    x = extns[i] ? `.${extns[i]}` : "";
    if (uri) arr.push(uri + x);
    arr.push(tmp + x);
  }

  return arr;
}

//https://github.com/lukeed/sirv/blob/ede9189b6c586cd4697e0ffb16671515fdefecde/packages/sirv/index.js#L31
export function viaCache(
  cache: Map<string, CacheObject>,
  uri: string,
  extns: Array<string>
) {
  let i = 0,
    data,
    arr = toAssume(uri, extns);
  for (; i < arr.length; i++) {
    if ((data = cache.get(arr[i]))) return data;
  }
}
