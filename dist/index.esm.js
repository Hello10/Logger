function _extends() {
  _extends = Object.assign || function (target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];

      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }

    return target;
  };

  return _extends.apply(this, arguments);
}

const Levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
const CONFIG_DELIMITER = ',';
const PART_DELIMITER = '|';
const NAME_DELIMITER = ':';
const CONFIG_SPLIT_REGEX = new RegExp(`[\\s${CONFIG_DELIMITER}]+`);
const PART_SPLIT_REGEX = new RegExp(`[\\s${PART_DELIMITER}]+`);
const ENV_KEY = 'LOGGER';

function isString(arg) {
  return (arg == null ? void 0 : arg.constructor) === String;
}

function isError(arg) {
  return arg instanceof Error;
}

function bounded(pattern) {
  return new RegExp(`^${pattern}$`);
}

class Logger {
  constructor(context = {}) {
    if (isString(context)) {
      context = {
        name: context
      };
    }

    if (!('name' in context)) {
      throw new Error('Must specify name for logger');
    }

    this.context = context;
    const {
      name
    } = context;
    this.name = name;
  }

  static set time(fn) {
    this._time = fn;
  }

  static enabled({
    level,
    name
  }) {
    const memo_key = [level, name].join(PART_DELIMITER);

    if (memo_key in this.memo) {
      return this.memo[memo_key];
    }

    for (const exclude of this.excludes) {
      if (exclude.test(name)) {
        this.memo[memo_key] = false;
        return false;
      }
    }

    const enabled = this.includes.some(include => {
      const level_index = Levels.indexOf(level);
      const this_index = Levels.indexOf(include.level);
      const level_enabled = level_index >= this_index;
      return level_enabled && include.name.test(name);
    });
    this.memo[memo_key] = enabled;
    return enabled;
  }

  static set config(configs) {
    this.includes = [];
    this.excludes = [];
    this.memo = {};

    if (!Array.isArray(configs)) {
      if (isString(configs)) {
        configs = configs.split(CONFIG_SPLIT_REGEX);
      } else {
        throw new Error('When setting .config pass string or array of strings');
      }
    }

    for (let config of configs) {
      const is_exclude = config[0] === '-';

      if (is_exclude) {
        if (config.includes(PART_DELIMITER)) {
          throw new Error('Exclude roles should not include level');
        }

        const name = bounded(config.substr(1));
        this.excludes.push(name);
      }

      let [name, level] = config.split(PART_SPLIT_REGEX);
      name = name.replace(/\*/g, '.*?');
      name = bounded(name);

      if (!level) {
        level = 'error';
      }

      const valid_level = Levels.includes(level);

      if (!valid_level) {
        throw new Error(`Invalid level ${level}`);
      }

      this.includes.push({
        name,
        level
      });
    }
  }

  static readConfig() {
    function read() {
      let config;

      if (typeof process !== 'undefined') {
        var _process$env;

        config = (_process$env = process.env) == null ? void 0 : _process$env[ENV_KEY];

        if (config) {
          return config;
        }
      }

      if (typeof window !== 'undefined') {
        var _window$localStorage;

        config = (_window$localStorage = window.localStorage) == null ? void 0 : _window$localStorage[ENV_KEY];

        if (config) {
          return config;
        }
      }

      return '*';
    }

    this.config = read();
  }

  child(context = {}) {
    if (isString(context)) {
      context = {
        name: context
      };
    }

    let {
      name
    } = this.context;

    if ('name' in context) {
      name = [name, context.name].join(NAME_DELIMITER);
    }

    const new_context = _extends({}, this.context, context, {
      name
    });

    const child = new this.constructor(new_context);
    child.level = this.level;
    return child;
  }

  _log(...args) {
    let body = _extends({}, this.context);

    for (const arg of args) {
      const has_message = ('message' in body);

      if (isString(arg)) {
        if (!has_message) {
          body.message = arg;
        }
      } else if (isError(arg)) {
        if (!has_message) {
          body.message = arg.message;
        }

        const props = Object.getOwnPropertyNames(arg);
        const payload = props.reduce((payload, key) => {
          payload[key] = arg[key];
          return payload;
        }, {});
        body.error = JSON.stringify(payload);
      } else if (arg) {
        body = _extends({}, body, arg);
      }
    }

    if (!('time' in body)) {
      body.time = this.constructor._time();
    }

    return body;
  }

}
Logger.includes = [];
Logger.excludes = [];
Logger.memo = {};

Logger._time = function () {
  return new Date().toISOString();
};

Logger.levels = Levels;
Levels.forEach(level => {
  const {
    console
  } = global;
  const fn = level === 'fatal' ? 'error' : level;

  Logger.prototype[level] = function log(...args) {
    const body = this._log(...args);

    const {
      message,
      name
    } = body;
    const enabled = Logger.enabled({
      level,
      name
    });

    if (enabled) {
      console[fn](message, body);
    }
  };

  Levels[level] = level;
});
Logger.readConfig();

export default Logger;
//# sourceMappingURL=index.esm.js.map
