export = jsqry;

declare module jsqry {
    /**
     * Returns the result of applying Jsqry *query* to *source*.
     * For Jsqry syntax refer {@link https://jsqry.github.io/}.
     * @param source  list or object to query
     * @param {string} query Jsqry query
     * @param args  optional arguments (when placeholders are used)
     * @returns The result array. Returns [] if query doesn't yield any result.
     */
    function query(source: any, query: string, ...args): any[];

    /**
     * Returns the 1st element of result of applying Jsqry *query* to *source*.
     * For Jsqry syntax refer {@link https://jsqry.github.io/}.
     * @param source  list or object to query
     * @param {string} query Jsqry query
     * @param args  optional arguments (when placeholders are used)
     * @returns The result element. Returns *null* if query doesn't yield any result.
     */
    function first(source: any, query: string, ...args): any;

    let fn: Fn;

    interface Fn {
        [x: string]: (pairs: Pair[], res: any[]) => void;
    }

    type Pair = [any, any];
}
