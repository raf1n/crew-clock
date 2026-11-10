import log from 'electron-log/main';

log.transports.console.level = process.env.NODE_ENV === 'development' ? 'debug' : 'info';
log.transports.file.level = 'info';

process.on('uncaughtException', (error) => {
  log.error('Uncaught exception', error);
});
process.on('unhandledRejection', (reason) => {
  log.error('Unhandled rejection', reason);
});

export { log };
