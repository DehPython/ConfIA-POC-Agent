function timestamp() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

const log = {
  info(module, message) {
    console.log(`[${timestamp()}] [INFO] [${module}] ${message}`);
  },
  warn(module, message) {
    console.warn(`[${timestamp()}] [WARN] [${module}] ${message}`);
  },
  error(module, message) {
    console.error(`[${timestamp()}] [ERROR] [${module}] ${message}`);
  },
};

module.exports = log;
