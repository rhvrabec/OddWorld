/**
 * Take a bean instance from ble-bean and make it a Node stream.
 *
 * @author J. Scott Smith
 * @copyright 2016 Humans Forward (J. Scott Smith, Paul Dhillon Weber). All rights reserved.
 * @license  MIT
 * @module lib/ble-bean-stream
 */

'use strict';

const asyncFlow = require('./funk').asyncFlow;
const toUInt16 = require('./funk').toUInt16;
const toInt16 = require('./funk').toInt16;

class BeanReadable extends require('hooked-readable') {
  constructor(bean, options) {
    let opts = Object.assign({
      pollAccell: false,
      pollBatt: false,
      pollTemp: false,
      listenSerial: false
    }, options);

    super(opts);

    this._bean = bean;
    this._interval = Number.isSafeInteger(opts.poll) ? opts.poll : 0;
    this._options = opts;
    this._tid = 0;

    // Set up scratches based on options
    this._scratches = [
      {idx: '1', key: 'scratch1', read: bean.readOne, notify: bean.notifyOne, unnotify: bean.unnotifyOne},
      {idx: '2', key: 'scratch2', read: bean.readTwo, notify: bean.notifyTwo, unnotify: bean.unnotifyTwo},
      {idx: '3', key: 'scratch3', read: bean.readThree, notify: bean.notifyThree, unnotify: bean.unnotifyThree},
      {idx: '4', key: 'scratch4', read: bean.readFour, notify: bean.notifyFour, unnotify: bean.unnotifyFour},
      {idx: '5', key: 'scratch5', read: bean.readFive, notify: bean.notifyFive, unnotify: bean.unnotifyFive}
    ];
    this._pollScratches = this._scratches.filter((scratch) => {
      return (typeof opts.pollScratch === 'string') && opts.pollScratch.includes(scratch.idx);
    });
    this._notifyScratches = this._scratches.filter((scratch) => {
      return (typeof opts.notifyScratch === 'string') && opts.notifyScratch.includes(scratch.idx);
    });
    for (let scratch of this._notifyScratches) {
      scratch.onReadCallback = this._onReadHandler.bind(this, scratch.key);
    }

    // Set up event listeners based on options
    if (opts.pollAccell) bean.on('accell', this._onAccellHandler.bind(this));
    if (opts.pollTemp) bean.on('temp', this._onTempHandler.bind(this));
    if (opts.listenSerial) bean.on('serial', this._onSerialHandler.bind(this));

    bean.on('disconnect', this._onDisconnectHandler.bind(this));
    bean.connectAndSetup(this._connectAndSetupHandler.bind(this));
  }

  _connectAndSetupHandler() {
    this.push({
      device: this._bean.id,
      info: {
        message: 'Connected'
      }
    });

    if (this._options.pollAccell || this._options.pollBatt || this._options.pollTemp || (this._pollScratches.length > 0)) {
      this._startPolling();
    }
    asyncFlow(this, this._notify); // Call notify on scratches
  }

  _onDisconnectHandler() {
    this._stopPolling()

    this.push({
      device: this._bean.id,
      info: {
        message: 'Disconnected'
      }
    });
    this.push(null); // Signal end-of-stream (EOF)

    this._bean.removeAllListeners();

    // Call unnotify on scratches
    asyncFlow(this, this._unnotify, () => {
      // Cleanup
      this._scratches = [];
      this._pollScratches = [];
      this._notifyScratches = [];
    });
  }

  _onAccellHandler(x, y, z, valid) {
    // Process 'accell' events
    if (!valid) return;

    this.push({
      device: this._bean.id,
      accell: {
        // Underlying lib returns string via toFixed()
        x: Number(x),
        y: Number(y),
        z: Number(z)
      }
    });
  }

  _onTempHandler(celsius, valid) {
    // Process 'temp' events
    if (!valid) return;

    this.push({
      device: this._bean.id,
      temp: {
        celsius: celsius
      }
    });
  }

  _onReadHandler(key, buf, valid) {
    // Process 'scratch' events
    if (!valid) return;

    let data = {
      device: this._bean.id,
    };
    data[key] = {
      data: buf + '',
      int: toInt16(buf[1], buf[0]),
      uint: toUInt16(buf[1], buf[0])
    };
    this.push(data);
  }

  _onSerialHandler(data, valid) {
    // Process 'serial' events
    if (!valid) return;

    this.push({
      device: this._bean.id,
      serial: {
        data: data + ''
      }
    });
  }

  // TODO: Rename generator?
  *_notify(ctx, resume) {
    // Process async requests synchronously

    for (let scratch of ctx._notifyScratches) try {
      scratch.notify.call(ctx._bean, scratch.onReadCallback, resume);

    } catch (e) {
      ctx.push({
        device: ctx._bean.id,
        error: {
          message: e.message
        }
      });
    }
  }

  // TODO: Rename generator?
  *_unnotify(ctx, resume) {
    // Process async requests synchronously

    for (let scratch of ctx._notifyScratches) try {
      scratch.unnotify.call(ctx._bean, scratch.onReadCallback, resume);

    } catch (e) {
      ctx.push({
        device: ctx._bean.id,
        error: {
          message: e.message
        }
      });
    }
  }

  *_readData(ctx, resume) {
    // Process async requests synchronously

    if (ctx._options.pollAccell) try {
      yield ctx._bean.requestAccell(resume);

    } catch (e) {
      ctx.push({
        device: ctx._bean.id,
        error: {
          message: e.message
        }
      });
    }

    if (ctx._options.pollBatt) try {
      let level = yield ctx._bean.readBatteryLevel(resume);
      ctx.push({
        device: ctx._bean.id,
        batt: {
          level: level
        }
      });

    } catch (e) {
      ctx.push({
        device: ctx._bean.id,
        error: {
          message: e.message
        }
      });
    }

    if (ctx._options.pollTemp) try {
      yield ctx._bean.requestTemp(resume);

    } catch (e) {
      ctx.push({
        device: ctx._bean.id,
        error: {
          message: e.message
        }
      });
    }

    for (let scratch of ctx._pollScratches) try {
      let buf = yield(scratch.read.call(ctx._bean, resume));
      let data = {
        device: ctx._bean.id,
      };
      data[scratch.key] = {
        data: buf + '',
        int: toInt16(buf[1], buf[0]),
        uint: toUInt16(buf[1], buf[0])
      };
      ctx.push(data);

    } catch (e) {
      ctx.push({
        device: ctx._bean.id,
        error: {
          message: e.message
        }
      });
    }
  }

  _startPolling() {
    this._tid = setTimeout(() => {
      this._tid = 0;
      asyncFlow(this, this._readData, () => {
        if (this._interval > 0) this._startPolling();
      });
    }, Math.max(500, this._interval));
  }

  _stopPolling() {
    if (this._tid === 0) return;
    clearTimeout(this._tid);
    this._tid = 0;
  }
}

/**
 * Export interface
 */

exports.createReadStream = (bean, options) => {
  return new BeanReadable(bean, options);
}

exports.BeanReadable = BeanReadable;
