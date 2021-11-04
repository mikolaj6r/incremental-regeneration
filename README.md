# incremental-regeneration

![npm](https://img.shields.io/npm/v/incremental-regeneration?color=green&logo=npm)

## About

This middleware adds so-called Incremental Static Regeneration to your server.

[More on ISR](https://www.netlify.com/blog/2021/03/08/incremental-static-regeneration-its-benefits-and-its-flaws/)

## Installation

```bash
npm i incremental-regeneration
```

## Basic usage

```js
import incrementalRegeneration from 'incremental-regeneration';

// define your server
const server = ...

const myFunctionThatRendersPage = (req, res) => void;

server.use(incrementalRegeneration({
  middleware: myFunctionThatRendersPage,
  revalidateTime: 10
}))
//
```

## Options

`revalidateTime` (in seconds): time boundary after which the resource will be regenerated

`middleware`: function that matches type (req: http.ClientRequest, res: http.ServerResponse) => void. This function is expected to render a response and write it to res param.
