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
      // 如果指定的端口没有进程在使用 则输出这个端口未被占用
      if (err || stderr) {
        resolve(`Port ${port} is not in use.`);
        return;
      }

      const pid = process.platform === 'win32'
        ? stdout.split('\n').find(line => line.includes('LISTEN')).trim().split(/\s+/).pop()
        : stdout.split('\n').map(line => line.trim()).filter(line => line).pop();

      if (pid) {
        console.log(`Process on port ${port} has PID: ${pid}`);

        // 杀死进程
        exec(killCommand(pid), (killErr, killStdout, killStderr) => {
          if (killErr) {
            reject(`Error killing process ${pid}: ${killErr}`);
            return;
          }
          if (killStderr) {
            reject(`stderr: ${killStderr}`);
            return;
          }
          resolve(`Process ${pid} killed successfully on port ${port}.`);
        });
      } else {
        resolve(`No process found on port ${port}`);
      }
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
