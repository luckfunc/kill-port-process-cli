#!/usr/bin/env node
const { exec } = require('child_process');

// 获取命令行参数
const args = process.argv.slice(2);

if (args.length < 1) {
  console.error('Usage: kill-port <port1> [<port2> ...]');
  process.exit(1);
}

const ports = args.map(port => parseInt(port, 10)).filter(port => !isNaN(port));

if (ports.length === 0) {
  console.error('Invalid port number(s)');
  process.exit(1);
}

const findPidCommand = port => process.platform === 'win32'
  ? `netstat -ano | findstr :${port}`
  : `lsof -i:${port} -t`;

const killCommand = pid => process.platform === 'win32'
  ? `taskkill /PID ${pid} /F`
  : `kill -9 ${pid}`;

const findAndKillProcess = (port) => {
  return new Promise((resolve, reject) => {
    // 查找占用指定端口的进程ID
    exec(findPidCommand(port), (err, stdout, stderr) => {
      if (err || stderr) {
        resolve(`Port ${port} is not in use.`);
        return;
      }

      const pids = process.platform === 'win32'
        ? stdout
          .split('\n')
          .filter(line => line.includes('LISTEN'))
          .map(line => line.trim().split(/\s+/).pop())
          .filter(Boolean)
        : stdout.split('\n').map(line => line.trim()).filter(Boolean);

      if (pids.length === 0) {
        resolve(`No process found on port ${port}`);
        return;
      }

      console.log(`Found processes on port ${port} with PIDs: ${pids.join(', ')}`);

      Promise.all(
        pids.map(pid =>
          new Promise((killResolve, killReject) => {
            exec(killCommand(pid), (killErr, killStdout, killStderr) => {
              if (killErr || killStderr) {
                killReject(`Error killing process ${pid}: ${killErr || killStderr}`);
                return;
              }
              killResolve(`Process ${pid} killed successfully on port ${port}.`);
            });
          })
        )
      )
        .then(killResults => resolve(killResults.join('\n')))
        .catch(killErr => reject(killErr));
    });
  });
};


// 并行处理所有端口
Promise.all(ports.map(findAndKillProcess))
  .then(results => {
    results.forEach(result => console.log(result));
  })
  .catch(err => {
    console.error(err);
  });
