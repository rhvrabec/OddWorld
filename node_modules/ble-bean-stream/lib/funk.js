/**
 * Some useful functions; just for the funk of it.
 *
 * @author J Scott Smith
 * @copyright 2016 Humans Forward (J. Scott Smith, Paul Dhillon Weber). All rights reserved.
 * @license  MIT
 * @module lib/funk
 */

'use strict';

function asyncFlow(ctx, gen, cb) {
  function done(err) {
    if (typeof cb === 'function') setImmediate(cb.bind(ctx, err));
  }

  function resume(err, data) {
    if (err) {
      try {
        if (iter.throw(err).done === true) done();
      } catch (e) {
        done(e); // Uncaught error in generator
      }
      return;
    }

    let results = Array.prototype.slice.call(arguments, 1);
    if (iter.next(results.length > 1 ? results : results[0]).done === true) done();
  }

  var iter = gen(ctx, resume); // Init generator with context and resume callback
  if (iter.next().done === true) done(); // Get it started
}

function toUInt16(msbyte, lsbyte) {
  return (msbyte << 8) | lsbyte;
}

function toInt16(msbyte, lsbyte) {
  let uint = toUInt16(msbyte, lsbyte);
  return (uint >= Math.pow(2, 15)) ? uint - Math.pow(2, 16) : uint;
}

exports.asyncFlow = asyncFlow;
exports.toUInt16 = toUInt16;
exports.toInt16 = toInt16;
