declare module "@polka/url" {
  import { ClientRequest, ServerResponse } from "http";

  interface ParsedObject {
    query: null | string;
    search: null | string;
    href: string;
    path: string;
    pathname: string;
    _raw: string;
  }

  export default function (ClientRequest, boolean): ParsedObject;
}
