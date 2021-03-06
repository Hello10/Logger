require('mocha');
const Assert = require('assert');
const Sinon = require('sinon');

const Logger = require('./dist');

const levels = Logger.levels.filter((level)=> {
  return (level !== Logger.levels.fatal);
});

describe('Logger', function () {
  const {console} = global;
  let logger;

  beforeEach(function () {
    for (const level of levels) {
      Sinon.spy(console, level);
    }
    logger = new Logger({
      name: 'fucky',
      hello: 10
    });
    Logger.config = '*|trace';
  });

  afterEach(function () {
    for (const level of levels) {
      console[level].restore();
    }
  });

  function getLastCallArgs ({level}) {
    const fn = (level === 'fatal') ? console.error : console[level];
    const call = fn.getCall(0);
    return call ? call.args : null;
  }

  function assertLastCallArgs ({level, output}) {
    const args = getLastCallArgs({level});
    delete args[1].time;
    Assert.deepEqual(args, output);
  }

  describe('should support', function () {
    for (const level of Logger.levels) {
      it(`.${level}`, function () {
        logger[level]('hello');
        assertLastCallArgs({
          level,
          output: [
            'hello',
            {
              hello: 10,
              message: 'hello',
              name: 'fucky'
            }
          ]
        });
      });
    }
  });

  describe('.child', function () {
    it('should create child with augmented context', function () {
      const child = logger.child({barf: 'borf'});
      child.info('donky');
      assertLastCallArgs({
        level: 'info',
        output: [
          'donky',
          {
            name: 'fucky',
            hello: 10,
            barf: 'borf',
            message: 'donky'
          }
        ]
      });
    });
  });

  describe('should handle logging errors', function () {
    it('single error argument', function () {
      const error = new Error('Honk');
      logger.error(error);
      const args = getLastCallArgs({
        level: 'error'
      });
      const message = args[0];
      const body = args[1];
      Assert.equal(message, 'Honk');
      Assert.equal(body.hello, 10);
    });

    it('custom error message', function () {
      const error = new Error('Honk');
      logger.error('Womp', error);
      const args = getLastCallArgs({
        level: 'error'
      });
      const message = args[0];
      const body = args[1];
      Assert.equal(message, 'Womp');
      Assert.equal(body.hello, 10);
    });
  });

  describe('should disable and stuff', function () {
    it('should disable on level', function () {
      Logger.config = '*|fatal';
      logger.info('Funk!');
      const args = getLastCallArgs({
        level: 'info'
      });
      Assert.equal(args, null);
    });
  });
});
