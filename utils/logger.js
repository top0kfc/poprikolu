const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.logDir = path.join(__dirname, '../logs');
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    if (data) {
      return `${logMessage}\n${JSON.stringify(data, null, 2)}`;
    }
    
    return logMessage;
  }

  writeToFile(level, message, data = null) {
    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(this.logDir, `${today}.log`);
    const formattedMessage = this.formatMessage(level, message, data);
    
    fs.appendFileSync(logFile, formattedMessage + '\n');
  }

  info(message, data = null) {
    const formattedMessage = this.formatMessage('info', message, data);
    console.log(`ℹ️ ${formattedMessage}`);
    this.writeToFile('info', message, data);
  }

  warn(message, data = null) {
    const formattedMessage = this.formatMessage('warn', message, data);
    console.warn(`⚠️ ${formattedMessage}`);
    this.writeToFile('warn', message, data);
  }

  error(message, error = null) {
    const errorData = error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : null;
    
    const formattedMessage = this.formatMessage('error', message, errorData);
    console.error(`❌ ${formattedMessage}`);
    this.writeToFile('error', message, errorData);
  }

  security(message, data = null) {
    const formattedMessage = this.formatMessage('security', message, data);
    console.log(`🔒 ${formattedMessage}`);
    
    // Security logs go to separate file
    const today = new Date().toISOString().split('T')[0];
    const securityLogFile = path.join(this.logDir, `security-${today}.log`);
    fs.appendFileSync(securityLogFile, formattedMessage + '\n');
  }

  action(message, data = null) {
    const formattedMessage = this.formatMessage('action', message, data);
    console.log(`🔨 ${formattedMessage}`);
    this.writeToFile('action', message, data);
  }
}

module.exports = Logger;