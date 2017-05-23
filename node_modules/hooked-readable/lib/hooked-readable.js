/**
 * A Readable stream with a beforePush hook.
 *
 * @author J. Scott Smith
 * @copyright 2016 Humans Forward (J. Scott Smith, Paul Dhillon Weber). All rights reserved.
 * @license  MIT
 * @module lib/hooked-readable
 */

'use strict';

const Readable = require('stream').Readable;

class HookedReadable extends Readable {
  constructor(options) {
    let opts = Object.assign({
      objectMode: true
    }, options);

    super(opts);

    this._before = (typeof opts.beforePush === 'function') ? opts.beforePush : this._defaultBefore;
  }

  _defaultBefore(data) {
    return data;
  }

  push(data) {
    let ret = super.push(data !== null ? this._before(data) : data);
    if (!ret) this.emit('overflow');
    return ret;
  }

  /**
   * All Readable stream implementations must provide a _read method
   * to fetch data from the underlying resource.
   */
  _read() {}
}

module.exports = HookedReadable;
