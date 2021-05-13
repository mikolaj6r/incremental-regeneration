import { Writable } from "stream";
import path, { resolve } from "path";
import fs from "fs";
import { promisify } from "util";
import events from "events";
import { ClientRequest, ServerResponse } from "http";

import parser from "@polka/url";

import { mkdirp, viaCache, CacheObject } from "./utils";

const writeFile = promisify(fs.writeFile);

type ServerResponseOptions = {
  _name: string;
  _cache: Map<string, CacheObject>;
};

type Middleware = (
  req: ClientRequest,
  res: ServerResponse,
  next?: Middleware
) => {};
type Headers = {
  [index: string]: string;
};

type Params = {
  middleware: Middleware;
  revalidateTime: number;
};

class ServerResponseMock extends Writable {
  statusCode = 0;
  locals = null;
  headers = new Map();
  _buffer: Array<Buffer> = [];
  _finished = false;
  _name = "";
  _cache: Map<string, CacheObject>;

  constructor(options: ServerResponseOptions) {
    super();
    this._name = options._name;
    this._cache = options._cache;
  }

  _write(
    chunk: string | Buffer,
    encoding: BufferEncoding = "utf8",
    cb?: (() => void) | undefined
  ) {
    this._buffer.push(Buffer.from(chunk));
    cb && cb();
  }

  _final(cb?: (() => void) | undefined) {
    this._finished = true;

    let export_dir = resolve(".", "__isr__");
    const export_file = path.join(export_dir, this._name + ".html");

    if (fs.existsSync(export_file)) {
      // overwriting file
    }

    mkdirp(path.dirname(export_file));

    writeFile(export_file, Buffer.concat(this._buffer)).then(() => {
      //const obj = cache.get(this._name);

      this._cache.set(this._name, {
        revalidating: false,
        abs: export_file,
        timestamp: Date.now(),
      });

      cb && cb();
    });
  }

  setHeader(name: string, value: string) {
    this.headers.set(name, value);
  }

  getHeader(name: string) {
    return this.headers.get(name);
  }
}

const EVENT_NAME = "revalidated";
let extensions = ["html", "htm"];
let fallback = "/";
const cache: Map<string, CacheObject> = new Map();
let lookup = viaCache.bind(0, cache);

export default function ({ middleware, revalidateTime = 10 }: Params) {
  return function (req: ClientRequest, res: ServerResponse, next: Middleware) {
    let name = req.path || parser(req, true).pathname;

    //let data = lookup(name, extensions) || lookup(fallback, extensions);

    let code = 200;
    let defaultHeaders = {
      "Content-Type": "text/html",
    };

    if (cache.has(name)) {
      const cacheItem = cache.get(name)!;

      if (!cacheItem.abs) {
        // file does not exist yet but is being created
        if (cacheItem.revalidating) {
          cacheItem.eventEmitter!.on(EVENT_NAME, () => {
            fs.createReadStream(cache.get(name)!.abs!).pipe(res);
          });
        }
      } else {
        // file already exist so stale-while-revalidate
        res.writeHead(code, defaultHeaders);
        fs.createReadStream(cacheItem.abs).pipe(res);

        if (cacheItem.timestamp! < Date.now() - revalidateTime * 1000) {
          if (cacheItem.revalidating) {
            return;
          }

          // revalidate
          cache.set(name, {
            ...cache.get(name),
            revalidating: true,
            eventEmitter: new events.EventEmitter(),
          });

          // intercept data so that it can be exported
          const responseMock = new ServerResponseMock({
            _name: name,
            _cache: cache,
          });

          // @ts-ignore
          middleware(req, responseMock);
        } else {
        }
      }
    } else {
      // generating for the first time
      cache.set(name, {
        revalidating: true,
      });

      const { write, end, setHeader } = res;
      const chunks: Array<Buffer> = [];
      const headers: Headers = {};

      // intercept data so that it can be exported
      res.write = function (chunk: string | Buffer) {
        chunks.push(Buffer.from(chunk));
        return write.apply(res, [chunk, "utf8"]);
      };

      res.setHeader = function (name: string, value: string) {
        if (res.headersSent) return;

        headers[name.toLowerCase()] = value;

        return setHeader.apply(res, [name, value]);
      };

      // @ts-ignore
      res.end = function (
        chunk: string | Buffer,
        encoding: BufferEncoding = "utf8",
        cb?: (() => void) | undefined
      ) {
        if (chunk) chunks.push(Buffer.from(chunk));
        const returned = end.apply(res, [chunk, encoding, cb]);

        const export_dir = resolve(".", "__isr__");
        const export_file = path.join(export_dir, name + ".html");

        if (fs.existsSync(export_file)) {
          // overwriting
        }

        mkdirp(path.dirname(export_file));

        writeFile(export_file, Buffer.concat(chunks)).then(() => {
          cache.set(name, {
            ...cache.get(name),
            abs: export_file,
            timestamp: Date.now(),
            revalidating: false,
          });

          return returned;
        });
      };

      middleware(req, res);
    }
  };
}
